/* EPUB/PDF conversions. All processing stays in the browser. */
(()=> {
 const $=id=>document.getElementById(id);
 const epubInput=$("epubInput"),epubBtn=$("epubToPdfBtn"),epubLabel=$("epubFileLabel"),epubStatus=$("epubStatus"),epubProgress=$("epubProgress"),epubBar=epubProgress.querySelector("span");
 const pdfInput=$("pdfEpubInput"),pdfBtn=$("pdfToEpubBtn"),pdfLabel=$("pdfEpubFileLabel"),pdfStatus=$("pdfEpubStatus"),pdfProgress=$("pdfEpubProgress"),pdfBar=pdfProgress.querySelector("span");
 let epubFile=null,pdfFile=null;
 const baseName=name=>name.replace(/\.(epub|pdf)$/i,"").replace(/[^a-z0-9-_]+/gi,"-").replace(/^-|-$/g,"")||"converted-book";
 const escapeXml=value=>String(value).replace(/[<>&'"]/g,c=>({"<":"&lt;",">":"&gt;","&":"&amp;","'":"&apos;",'"':"&quot;"}[c]));
 function save(blob,name){const url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),10000)}
 function progress(el,bar,value){el.classList.remove("hidden");bar.style.width=value+"%"}
 epubInput.addEventListener("change",()=>{epubFile=epubInput.files?.[0]||null;epubBtn.disabled=!epubFile;epubLabel.textContent=epubFile?epubFile.name:"EPUB files only";epubStatus.textContent=epubFile?"Ready to convert.":""});
 pdfInput.addEventListener("change",()=>{pdfFile=pdfInput.files?.[0]||null;pdfBtn.disabled=!pdfFile;pdfLabel.textContent=pdfFile?pdfFile.name:"PDF files only";pdfStatus.textContent=pdfFile?"Ready to convert.":""});
 epubBtn.addEventListener("click",async()=>{
  if(!epubFile)return;
  if(!window.ePub||!window.html2canvas||!window.jspdf?.jsPDF){epubStatus.textContent="A conversion library did not load. Refresh the page and try again.";return}
  epubBtn.disabled=true;progress(epubProgress,epubBar,2);let host=null,book=null;
  try{
   epubStatus.textContent="Opening EPUB…";
   book=ePub(await epubFile.arrayBuffer());
   await book.ready;
   const metadata=await book.loaded.metadata;
   host=document.createElement("div");host.style.cssText="position:fixed;left:-10000px;top:0;width:794px;height:1123px;background:#fff;overflow:hidden";document.body.appendChild(host);
   const rendition=book.renderTo(host,{width:794,height:1123,flow:"paginated",spread:"none",manager:"default"});
   await rendition.display();
   const pdf=new window.jspdf.jsPDF({orientation:"portrait",unit:"mm",format:"a4",compress:true});
   let pageCount=0,done=false;
   const renderCurrent=async()=>{
    const frame=host.querySelector("iframe");
    if(!frame?.contentDocument?.body)throw new Error("Could not render an EPUB page.");
    await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
    const canvas=await html2canvas(frame.contentDocument.body,{backgroundColor:"#ffffff",scale:1,useCORS:true,logging:false,windowWidth:frame.contentDocument.documentElement.scrollWidth,windowHeight:frame.contentDocument.documentElement.scrollHeight});
    if(pageCount>0)pdf.addPage("a4","portrait");
    pdf.addImage(canvas.toDataURL("image/jpeg",0.88),"JPEG",0,0,210,297,undefined,"FAST");
    pageCount++;progress(epubProgress,epubBar,Math.min(95,pageCount*5));
   };
   await renderCurrent();
   while(!done&&pageCount<500){
    const before=rendition.currentLocation()?.end?.cfi;
    await rendition.next();
    const after=rendition.currentLocation()?.end?.cfi;
    if(!after||after===before){done=true;break}
    await renderCurrent();
   }
   if(pageCount>=500)throw new Error("This EPUB is too large to convert in one run (500-page safety limit).");
   save(pdf.output("blob"),baseName(epubFile.name)+".pdf");
   epubStatus.textContent="Done — "+pageCount+" PDF page(s) created"+(metadata?.title?" for "+metadata.title:"")+".";
   epubBar.style.width="100%";
  }catch(err){console.error(err);epubStatus.textContent="Conversion failed: "+(err.message||"Unable to read this EPUB.")}
  finally{if(host)host.remove();if(book)try{book.destroy()}catch{}epubBtn.disabled=!epubFile}
 });
 pdfBtn.addEventListener("click",async()=>{
  if(!pdfFile)return;
  if(!window.pdfjsLib||!window.JSZip){pdfStatus.textContent="A conversion library did not load. Refresh the page and try again.";return}
  pdfBtn.disabled=true;progress(pdfProgress,pdfBar,2);
  try{
   pdfStatus.textContent="Reading PDF text…";
   const doc=await pdfjsLib.getDocument({data:new Uint8Array(await pdfFile.arrayBuffer())}).promise;
   if(doc.numPages>300)throw new Error("For safety, convert PDFs with 300 pages or fewer.");
   const zip=new JSZip();zip.file("mimetype","application/epub+zip",{compression:"STORE"});
   zip.file("META-INF/container.xml",'<?xml version="1.0" encoding="UTF-8"?><container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container"><rootfiles><rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/></rootfiles></container>');
   const manifest=[],spine=[],nav=[];
   for(let n=1;n<=doc.numPages;n++){
    const page=await doc.getPage(n),content=await page.getTextContent();
    const lines=[];let current=[],lastY=null;
    for(const item of content.items){if(!item.str)continue;const y=item.transform?.[5]??0;if(lastY!==null&&Math.abs(y-lastY)>4){if(current.length)lines.push(current.join(" "));current=[];}current.push(item.str);lastY=y;}
    if(current.length)lines.push(current.join(" "));
    const textContent=lines.map(line=>"<p>"+escapeXml(line)+"</p>").join("\n")||"<p>[No selectable text found on this page. This may be a scanned page and requires OCR.]</p>";
    const id="page"+n,file="chapter"+n+".xhtml";
    zip.file("OEBPS/"+file,'<?xml version="1.0" encoding="UTF-8"?><html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops"><head><title>Page '+n+'</title><meta charset="utf-8"/><style>body{font-family:serif;line-height:1.55;margin:5%;}p{margin:.45em 0;text-indent:0}</style></head><body><h2>Page '+n+'</h2>'+textContent+'</body></html>');
    manifest.push('<item id="'+id+'" href="'+file+'" media-type="application/xhtml+xml"/>');spine.push('<itemref idref="'+id+'"/>');nav.push('<li><a href="'+file+'">Page '+n+'</a></li>');
    page.cleanup();progress(pdfProgress,pdfBar,Math.round(n/doc.numPages*85));
   }
   zip.file("OEBPS/nav.xhtml",'<?xml version="1.0" encoding="UTF-8"?><html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops"><head><title>Contents</title></head><body><nav epub:type="toc" id="toc"><h1>Contents</h1><ol>'+nav.join("")+'</ol></nav></body></html>');
   zip.file("OEBPS/content.opf",'<?xml version="1.0" encoding="UTF-8"?><package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="bookid" xml:lang="en"><metadata xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:identifier id="bookid">urn:uuid:'+crypto.randomUUID()+'</dc:identifier><dc:title>'+escapeXml(baseName(pdfFile.name))+'</dc:title><dc:language>en</dc:language></metadata><manifest><item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/>'+manifest.join("")+'</manifest><spine>'+spine.join("")+'</spine></package>');
   pdfStatus.textContent="Packaging EPUB…";
   const blob=await zip.generateAsync({type:"blob",mimeType:"application/epub+zip",compression:"DEFLATE",compressionOptions:{level:6}},meta=>progress(pdfProgress,pdfBar,85+Math.round(meta.percent*.15)));
   save(blob,baseName(pdfFile.name)+".epub");pdfStatus.textContent="Done — EPUB created with "+doc.numPages+" page sections. Text only; original page layout and images are not preserved.";pdfBar.style.width="100%";
  }catch(err){console.error(err);pdfStatus.textContent="Conversion failed: "+(err.message||"Unable to read this PDF.")}
  finally{pdfBtn.disabled=!pdfFile}
 });
})();