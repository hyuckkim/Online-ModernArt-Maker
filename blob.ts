import * as rust from "./pkg/hello_wasm.js";
rust.default();

var inputElement = document.querySelector('body > div > input[type=file]') as HTMLInputElement;
var bgElement = document.querySelector('body > div') as HTMLElement;
var url: string = "", pixelurl = "";
var filename = "";
var range: HTMLInputElement;
var submit: HTMLInputElement;
var log: HTMLSpanElement;

export function logging(s: string) {
    log.innerText = "status: " + s;
}
async function readFile(event: ProgressEvent<FileReader>) {
    if (event.target instanceof FileReader && event.target.result instanceof ArrayBuffer) {
        var result = event.target.result;

        url = imageBlob(result);
        setUItoImage(url);
        createInterface();
    }
}
function imageBlob(data: ArrayBuffer): string {
    var property = {type:'image/*'};
    var blob = new Blob([data], property);
    return createUrl(blob);
}
function createUrl(blob: Blob): string {
    var urlCreator = window.URL || window.webkitURL;
    var imageUrl = urlCreator.createObjectURL(blob);
    return imageUrl;
}
function setUItoImage(imageUrl: string) {
    bgElement.style.backgroundImage = "url('" + imageUrl + "')";
    inputElement.style.display = "none";
    console.log(imageUrl);
}
function createInterface() {
    bgElement.insertAdjacentHTML("beforeend", 
`
<div id="newmenu">
<input id="menuslider" type="range" min="2" max="256" value="4">
<input id="menubuton" type="button" value="4색 팔레트 만들기!">
<span id="menuarticle"></span>
</div>
    `);
    range = document.querySelector('body > div > div[id=newmenu] > input[type=range]') as HTMLInputElement;
    submit = document.querySelector('body > div > div[id=newmenu] > input[type=button]') as HTMLInputElement;
    log = document.querySelector('body > div > div[id=newmenu] > span') as HTMLSpanElement;
    range.addEventListener("change", rangeChanged);
    submit.addEventListener("click", submitPressed);
}
function rangeChanged() {
    submit.value = range.value + "색 팔레트 만들기!";
}
function submitPressed() {
    pixelizeButton(Number.parseInt(range.value));
}
async function pixelizeButton(colors: number) {
    var data: ImageData = await makeCanvas(url);
    var pixelized = await quantize(data, colors);
    if (pixelurl === "") {
        createNextInterface();
    }
    pixelurl = pixelized;
    setUItoImage(pixelized);
}
async function makeCanvas(blob: string): Promise<ImageData> {
    const img = document.createElement('img');
    img.src = blob;
    await new Promise((resolve) => (img.onload = resolve));
    const canvas = document.createElement('canvas');
    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext('2d') as CanvasRenderingContext2D;
    ctx.drawImage(img, 0, 0);
    return ctx.getImageData(0, 0, img.width, img.height);
}
async function quantize(img: ImageData, colors: number): Promise<string> {
    var quantized = await (async () => rust.quantize(img.data, img.width, img.height, colors, 1.0))();
    var blob = imageBlob(quantized.buffer);
    return blob;
}
function createNextInterface() {
    bgElement.insertAdjacentHTML("beforeend", 
`
<div id="palettemenu">
<input id="menubuton" type="button" value="다운로드">
</div>
    `);
    var download = document.querySelector('body > div > div[id=palettemenu] > input[type=button]') as HTMLInputElement;
    download.addEventListener("click", downloadPressed);
}
function downloadPressed() {
    const contentType = "image/png";
    var a = document.createElement('a');
    a.download = filename;
    a.href = pixelurl;
    a.click();
}
function changeFile() {
    if (inputElement.files instanceof FileList) {
        var file = inputElement.files[0];
        var reader = new FileReader();
        reader.addEventListener('load', readFile);
        reader.readAsArrayBuffer(file);
        filename = file.name;
    }
}
inputElement.addEventListener('change', changeFile);