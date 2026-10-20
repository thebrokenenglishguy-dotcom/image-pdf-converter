const fileInput=document.getElementById("fileInput"),dropZone=document.getElementById("dropZone"),editor=document.getElementById("editor"),fileList=document.getElementById("fileList"),fileCount=document.getElementById("fileCount"),clearBtn=document.getElementById("clearBtn"),format=document.getElementById("format"),pageSize=document.getElementById("pageSize"),widthInput=document.getElementById("width"),heightInput=document.getElementById("height"),quality=document.getElementById("quality"),qualityValue=document.getElementById("qualityValue"),keepRatio=document.getElementById("keepRatio"),sizeMode=document.getElementById("sizeMode"),targetKB=document.getElementById("targetKB"),targetSizeGroup=document.getElementById("targetSizeGroup"),convertBtn=document.getElementById("convertBtn"),progress=document.getElementById("progress"),progressBar=progress.querySelector("span"),status=document.getElementById("status");let files=[];const perFileTargetKB=new Map();
function isHeic(file){return /\.(heic|heif)$/i.test(file.name)||/image\/(heic|heif)/i.test(file.type)}
function isP65(file){return /\.p65$/i.test(file.name)||/pagemaker/i.test(file.type)}
function formatBytes(n){if(n<1024)return n+" B";if(n<1048576)return(n/1024).toFixed(1)+" KB";return(n/1048576).toFixed(1)+" MB"}
function addFiles(list){const incoming=Array.from(list).filter(f=>f.type.startsWith("image/")||/\.(jpe?g|png|webp|heic|heif|p65)$/i.test(f.name));files=[...files,...incoming];render();if(!incoming.length)status.textContent="Please choose an image file or a P65 PageMaker file."}
function render(){fileList.innerHTML="";files.forEach((file,i)=>{const item=document.createElement("div");item.className="file-item";const img=document.createElement("img");img.className="thumb";img.alt="";if(!isHeic(file)&&!isP65(file))img.src=URL.createObjectURL(file);else img.src=isP65(file)?"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='44' height='44'%3E%3Crect width='44' height='44' rx='8' fill='%23eef1f6'/%3E%3Ctext x='22' y='27' text-anchor='middle' font-family='Arial' font-size='11' fill='%23687585'%3EP65%3C/text%3E%3C/svg%3E":"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='44' height='44'%3E%3Crect width='44' height='44' rx='8' fill='%23eef1f6'/%3E%3Ctext x='22' y='27' text-anchor='middle' font-family='Arial' font-size='11' fill='%23687585'%3EHEIC%3C/text%3E%3C/svg%3E";const name=document.createElement("span");name.className="file-name";name.textContent=file.name;const size=document.createElement("span");size.className="file-size";size.textContent=formatBytes(file.size);const targetWrap=document.createElement("label");targetWrap.className="per-file-target"+(sizeMode.value==="target"&&(format.value==="jpeg"||format.value==="webp")?"":" hidden");targetWrap.textContent="KB";const targetInput=document.createElement("input");targetInput.type="number";targetInput.min="5";targetInput.max="20000";targetInput.step="1";targetInput.inputMode="numeric";targetInput.setAttribute("aria-label","Target size in KB for "+file.name);if(!perFileTargetKB.has(file))perFileTargetKB.set(file,Number(targetKB.value)||100);targetInput.value=perFileTargetKB.get(file);targetInput.onchange=()=>{const v=Math.max(5,Math.min(20000,Number(targetInput.value)||100));targetInput.value=v;perFileTargetKB.set(file,v)};targetWrap.appendChild(targetInput);const remove=document.createElement("button");remove.className="remove";remove.textContent="×";remove.setAttribute("aria-label","Remove "+file.name);remove.onclick=()=>{files.splice(i,1);perFileTargetKB.delete(file);render()};item.append(img,name,size,targetWrap,remove);fileList.appendChild(item)});fileCount.textContent=files.length+" file"+(files.length===1?"":"s");editor.classList.toggle("hidden",files.length===0)}
fileInput.onchange=e=>addFiles(e.target.files);
// Desktop clipboard support: paste copied image data with Ctrl+V / Cmd+V.
document.addEventListener("paste",e=>{const items=Array.from(e.clipboardData&&e.clipboardData.items||[]);const imageItems=items.filter(item=>item.kind==="file"&&item.type.startsWith("image/"));if(!imageItems.length)return;const pasted=imageItems.map((item,index)=>{const blob=item.getAsFile();if(!blob)return null;const ext=(blob.type.split("/")[1]||"png").replace("jpeg","jpg");return new File([blob],"pasted-image-"+Date.now()+"-"+(index+1)+"."+ext,{type:blob.type||"image/png",lastModified:Date.now()})}).filter(Boolean);if(pasted.length){e.preventDefault();addFiles(pasted);status.textContent=pasted.length===1?"Pasted image added. Choose Convert & Download when ready.":pasted.length+" pasted images added. Choose Convert & Download when ready.";}});["dragenter","dragover"].forEach(ev=>dropZone.addEventListener(ev,e=>{e.preventDefault();dropZone.classList.add("drag")}));["dragleave","drop"].forEach(ev=>dropZone.addEventListener(ev,e=>{e.preventDefault();dropZone.classList.remove("drag")}));dropZone.addEventListener("drop",e=>addFiles(e.dataTransfer.files));dropZone.addEventListener("keydown",e=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();fileInput.click()}});clearBtn.onclick=()=>{files=[];fileInput.value="";render();status.textContent=""};quality.oninput=()=>qualityValue.textContent=quality.value+"%";
sizeMode.onchange=()=>{targetSizeGroup.classList.toggle("hidden",sizeMode.value!=="target");widthInput.disabled=false;heightInput.disabled=false;keepRatio.disabled=false;if(files.length)render();};
const pageSizeGroup=document.getElementById("pageSizeGroup");format.onchange=()=>{pageSize.disabled=format.value!=="pdf";pageSizeGroup.classList.toggle("hidden",format.value!=="pdf");if(files.length)render();};
function loadImage(file){return new Promise(async(resolve,reject)=>{try{let blob=file;if(isHeic(file)){if(typeof heic2any!=="function")throw new Error("HEIC converter library did not load.");blob=await heic2any({blob:file,toType:"image/jpeg",quality:.95});if(Array.isArray(blob))blob=blob[0]}const url=URL.createObjectURL(blob),img=new Image();img.onload=()=>{URL.revokeObjectURL(url);resolve(img)};img.onerror=()=>{URL.revokeObjectURL(url);reject(new Error("Could not read "+file.name))};img.src=url}catch(e){reject(e)}})}
const dimensionUnit=document.getElementById("dimensionUnit"),dimensionDpi=document.getElementById("dimensionDpi"),dimensionDpiGroup=document.getElementById("dimensionDpiGroup"),widthLabel=document.getElementById("widthLabel"),heightLabel=document.getElementById("heightLabel");
function updateDimensionUnits(){const unit=dimensionUnit?dimensionUnit.value:"px";widthLabel.textContent="Width ("+unit+")";heightLabel.textContent="Height ("+unit+")";dimensionDpiGroup.classList.toggle("hidden",unit!=="cm");widthInput.step=unit==="cm"?"0.01":"1";heightInput.step=unit==="cm"?"0.01":"1";widthInput.min=unit==="cm"?"0.01":"1";heightInput.min=unit==="cm"?"0.01":"1";}
if(dimensionUnit)dimensionUnit.addEventListener("change",updateDimensionUnits);if(dimensionDpi)dimensionDpi.addEventListener("change",()=>{});updateDimensionUnits();
function resizedCanvas(img){let w=img.naturalWidth||img.width,h=img.naturalHeight||img.height;let tw=Number(widthInput.value),th=Number(heightInput.value);if(dimensionUnit&&dimensionUnit.value==="cm"){const dpi=Number(dimensionDpi.value)||300;tw=tw>0?Math.round(tw/2.54*dpi):0;th=th>0?Math.round(th/2.54*dpi):0;}else{tw=tw>0?Math.round(tw):0;th=th>0?Math.round(th):0;}if(!(tw>0||th>0)){const c=document.createElement("canvas");c.width=w;c.height=h;c.getContext("2d").drawImage(img,0,0);return c;}if(tw>0||th>0){if(keepRatio.checked){if(tw>0){w=tw;h=Math.max(1,Math.round(img.height/img.width*w))}else{h=th;w=Math.max(1,Math.round(img.width/img.height*h))}}else{w=tw>0?tw:w;h=th>0?th:h}}const c=document.createElement("canvas");c.width=w;c.height=h;const ctx=c.getContext("2d");ctx.fillStyle="#fff";ctx.fillRect(0,0,w,h);ctx.drawImage(img,0,0,w,h);return c}
function canvasBlob(canvas,type,q){return new Promise((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(new Error("Could not create output.")),type,q))}
async function encodeForTarget(canvas,mime,originalFile,targetKBOverride){
  if(sizeMode.value!=="target")return canvasBlob(canvas,mime,mime==="image/png"?undefined:Number(quality.value)/100);
  if(mime==="image/png"){status.textContent="PNG uses lossless compression, so a target KB cannot be controlled reliably. Choose JPG or WebP for size targeting.";return canvasBlob(canvas,mime)}
  const target=Math.max(5,Number(targetKBOverride)||Number(targetKB.value)||100)*1024;
  let low=0.1,high=1,best=null;
  for(let i=0;i<9;i++){
    const q=(low+high)/2,blob=await canvasBlob(canvas,mime,q);
    if(blob.size<=target){best=blob;low=q;}else high=q;
  }
  if(!best){best=await canvasBlob(canvas,mime,0.1);}
  if(best.size>target)status.textContent="Could not reach "+targetKB.value+" KB without more quality loss. Best result: "+formatBytes(best.size)+".";
  else status.textContent="Target reached: "+formatBytes(best.size)+".";
  return best;
}function safeName(n){return n.replace(/\.[^.]+$/,"").replace(/[^a-z0-9_-]+/gi,"-")||"converted"}
function download(blob,name){const url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download=name;a.style.display="none";a.rel="noopener";document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),10000)}
async function downloadFilesAsZip(items,zipName){if(!window.JSZip)throw new Error("Download packaging library did not load. Refresh the page and try again.");const zip=new JSZip();items.forEach(item=>zip.file(item.name,item.blob));const blob=await zip.generateAsync({type:"blob"});download(blob,zipName)}

async function convertP65(file){
  status.textContent="Opening PageMaker file…";
  const factory=(await import("./p65/dist/pmd2svg.js")).default;
  let output="",errors="";
  const Module=await factory({print:(s)=>{output+=s+"\\n"},printErr:(s)=>{errors+=s+"\\n"}});
  const data=new Uint8Array(await file.arrayBuffer());
  Module.FS.writeFile("/input.p65",data);
  try{Module.callMain(["pmd2svg","/input.p65"]);}catch(e){if(!output.trim())throw new Error(errors||e.message||"P65 conversion failed.");}
  const doc=new DOMParser().parseFromString(output,"application/xhtml+xml");
  const svgs=Array.from(doc.getElementsByTagNameNS("http://www.w3.org/2000/svg","svg"));
  if(!svgs.length)throw new Error(errors||"The PageMaker engine could not render this P65 file.");
  const canvases=[];
  for(const svg of svgs){
    const svgText=new XMLSerializer().serializeToString(svg);
    const blob=new Blob([svgText],{type:"image/svg+xml;charset=utf-8"});
    const url=URL.createObjectURL(blob);
    const img=await new Promise((resolve,reject)=>{const i=new Image();i.onload=()=>{URL.revokeObjectURL(url);resolve(i)};i.onerror=()=>{URL.revokeObjectURL(url);reject(new Error("A PageMaker page could not be rendered."))};i.src=url});
    const canvas=document.createElement("canvas");
    canvas.width=Math.max(1,img.naturalWidth||img.width||1600);
    canvas.height=Math.max(1,img.naturalHeight||img.height||2200);
    canvas.getContext("2d").drawImage(img,0,0,canvas.width,canvas.height);
    canvases.push(canvas);
  }
  if(format.value==="pdf"){
    const {jsPDF}=window.jspdf;let pdf=null;
    canvases.forEach((canvas,i)=>{
      const ratio=canvas.height/canvas.width,wmm=210,hmm=Math.max(1,210*ratio);
      if(i===0)pdf=new jsPDF({orientation:"portrait",unit:"mm",format:[wmm,hmm]});
      else pdf.addPage([wmm,hmm],"portrait");
      pdf.addImage(canvas.toDataURL("image/jpeg",Number(quality.value)/100),"JPEG",0,0,wmm,hmm,undefined,"FAST");
      progressBar.style.width=((i+1)/canvases.length*100)+"%";
    });
    download(pdf.output("blob"),safeName(file.name)+".pdf");
  }else{
    const outputs=[];
    for(let i=0;i<canvases.length;i++){
      const mime={jpeg:"image/jpeg",png:"image/png",webp:"image/webp"}[format.value]||"image/png";
      const ext=format.value==="jpeg"?"jpg":format.value;
      const blob=await canvasBlob(canvases[i],mime,format.value==="png"?undefined:Number(quality.value)/100);
      outputs.push({blob,name:safeName(file.name)+"-page-"+(i+1)+"."+ext});
      progressBar.style.width=((i+1)/canvases.length*100)+"%";
    }
    if(outputs.length===1)download(outputs[0].blob,outputs[0].name);else await downloadFilesAsZip(outputs,safeName(file.name)+"-pages.zip");
  }
}
async function makePdf(){const {jsPDF}=window.jspdf;const sizes={a4:[210,297],a5:[148,210],letter:[216,279]};let pdf=null;for(let i=0;i<files.length;i++){status.textContent="Converting "+(i+1)+" of "+files.length+"...";const img=await loadImage(files[i]),canvas=resizedCanvas(img);let wmm,hmm;if(pageSize.value==="original"){wmm=210;hmm=Math.max(1,210*(canvas.height/canvas.width))}else{[wmm,hmm]=sizes[pageSize.value];if(canvas.width>canvas.height)[wmm,hmm]=[hmm,wmm]}if(!pdf)pdf=new jsPDF({orientation:wmm>hmm?"landscape":"portrait",unit:"mm",format:[wmm,hmm]});else pdf.addPage([wmm,hmm],wmm>hmm?"landscape":"portrait");pdf.addImage(canvas.toDataURL("image/jpeg",Number(quality.value)/100),"JPEG",0,0,wmm,hmm,undefined,"FAST");progressBar.style.width=((i+1)/files.length*100)+"%"}download(pdf.output("blob"),"converted-images.pdf")}
async function makeImages(){const mime={jpeg:"image/jpeg",png:"image/png",webp:"image/webp"}[format.value],ext=format.value==="jpeg"?"jpg":format.value;const outputs=[];for(let i=0;i<files.length;i++){status.textContent="Converting "+(i+1)+" of "+files.length+"...";const img=await loadImage(files[i]),canvas=resizedCanvas(img),blob=await encodeForTarget(canvas,mime,files[i],perFileTargetKB.get(files[i]));outputs.push({blob,name:safeName(files[i].name)+"."+ext});progressBar.style.width=((i+1)/files.length*100)+"%"}if(outputs.length===1)download(outputs[0].blob,outputs[0].name);else await downloadFilesAsZip(outputs,"converted-images.zip")}
convertBtn.onclick=async()=>{if(!files.length)return;if(sizeMode.value==="target"&&format.value==="pdf"){status.textContent="Target KB mode is for JPG/WebP images. Select JPG or WebP, or use PDF mode without a target size.";return;}convertBtn.disabled=true;progress.classList.remove("hidden");progressBar.style.width="0%";try{if(files.some(isP65)){if(files.length!==1||!isP65(files[0]))throw new Error("For P65, select one .p65 file at a time.");await convertP65(files[0]);}else if(format.value==="pdf")await makePdf();else await makeImages();status.textContent="Done — your file is ready to download."}catch(e){console.error(e);status.textContent="Conversion failed: "+e.message}finally{convertBtn.disabled=false}};sizeMode.onchange();format.onchange();

/* PDF to image conversion (runs locally in the browser). */
(()=>{
 const input=document.getElementById("pdfInput"),button=document.getElementById("pdfConvertBtn"),fmt=document.getElementById("pdfImageFormat"),scaleSelect=document.getElementById("pdfScale"),pagesSelect=document.getElementById("pdfPages"),label=document.getElementById("pdfFileLabel"),msg=document.getElementById("pdfStatus"),bar=document.querySelector("#pdfProgress span"),progress=document.getElementById("pdfProgress"),drop=document.getElementById("pdfDropZone");
 if(!input||!button)return;
 let chosenPdf=null;
 if(window.pdfjsLib)pdfjsLib.GlobalWorkerOptions.workerSrc="https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.worker.min.js";
 function pdfMessage(t){msg.textContent=t}
 input.addEventListener("change",()=>{chosenPdf=input.files&&input.files[0]||null;button.disabled=!chosenPdf;label.textContent=chosenPdf?chosenPdf.name+" · "+(chosenPdf.size/1024/1024).toFixed(2)+" MB":"PDF · multi-page documents supported";pdfMessage(chosenPdf?"Ready to convert.": "");});
 ["dragenter","dragover"].forEach(ev=>drop.addEventListener(ev,e=>{e.preventDefault();drop.classList.add("drag")}));
 ["dragleave","drop"].forEach(ev=>drop.addEventListener(ev,e=>{e.preventDefault();drop.classList.remove("drag")}));
 drop.addEventListener("drop",e=>{const f=e.dataTransfer.files&&Array.from(e.dataTransfer.files).find(x=>/\.pdf$/i.test(x.name)||x.type==="application/pdf");if(f){chosenPdf=f;button.disabled=false;label.textContent=f.name+" · "+(f.size/1024/1024).toFixed(2)+" MB";pdfMessage("PDF selected. Ready to convert.")}else pdfMessage("Please choose a PDF file.")});
 button.addEventListener("click",async()=>{
  if(!chosenPdf)return;
  if(!window.pdfjsLib){pdfMessage("PDF engine did not load. Check your internet connection and refresh.");return}
  button.disabled=true;progress.classList.remove("hidden");bar.style.width="0%";
  let doc;
  try{
   pdfMessage("Opening PDF…");
   doc=await pdfjsLib.getDocument({data:new Uint8Array(await chosenPdf.arrayBuffer())}).promise;
   const total=pagesSelect.value==="current"?1:doc.numPages;
   if(total>100){pdfMessage("This PDF has "+total+" pages. For safety, convert documents in smaller parts (100 pages or fewer).");return}
   const mime=fmt.value,ext=mime==="image/jpeg"?"jpg":"png",zip=new JSZip();
   for(let n=1;n<=total;n++){
    pdfMessage("Rendering page "+n+" of "+total+"…");
    const page=await doc.getPage(n),viewport=page.getViewport({scale:Number(scaleSelect.value)});
    const canvas=document.createElement("canvas"),ctx=canvas.getContext("2d");
    canvas.width=Math.ceil(viewport.width);canvas.height=Math.ceil(viewport.height);
    await page.render({canvasContext:ctx,viewport}).promise;
    const blob=await new Promise((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(new Error("Could not encode page "+n)),mime,mime==="image/jpeg"?0.94:undefined));
    zip.file("page-"+String(n).padStart(3,"0")+"."+ext,blob);
    page.cleanup();canvas.width=0;canvas.height=0;bar.style.width=Math.round(n/total*100)+"%";
   }
   pdfMessage("Packing images into one ZIP file…");
   const zipped=await zip.generateAsync({type:"blob"},meta=>{bar.style.width=Math.round(meta.percent)+"%"});
   const url=URL.createObjectURL(zipped),a=document.createElement("a");
   a.href=url;a.download=(chosenPdf.name.replace(/\.pdf$/i,"")||"pdf-pages")+"-images.zip";document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),5000);
   pdfMessage("Done! "+total+" page"+(total===1?"":"s")+" saved as "+ext.toUpperCase()+" images inside a ZIP file.");
  }catch(err){console.error(err);pdfMessage("Conversion failed: "+(err&&err.message||"Unable to read this PDF."))}
  finally{button.disabled=!chosenPdf}
 });
})();
