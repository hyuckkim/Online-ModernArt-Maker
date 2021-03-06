import * as rust from "./pkg/hello_wasm.js";
rust.default();
var quantizeWorker = new Worker('wasmworker.js', { type: 'module' });
const inputElement = document.querySelector('body > div > input[type=file]');
var newName = "palette.png";
inputElement.addEventListener('change', function () {
    if (inputElement.files instanceof FileList) {
        var file = inputElement.files[0];
        readFileAndCallback(file, readFile);
        newName = makeNewName(file.name);
    }
});
function readFileAndCallback(file, callback) {
    var reader = new FileReader();
    reader.addEventListener('load', callback);
    reader.readAsArrayBuffer(file);
}
var bgElement = document.querySelector('body > div');
async function readFile(event) {
    if (event.target instanceof FileReader && event.target.result instanceof ArrayBuffer) {
        var result = event.target.result;
        var blob = imageBlob(result);
        url = createUrl(blob);
        setUItoImage(url);
        createInterface(bgElement);
        colornizeIfPaletted(result, blob);
    }
}
function imageBlob(data) {
    var property = { type: 'image/*' };
    var blob = new Blob([data], property);
    return blob;
}
function createUrl(blob) {
    var urlCreator = window.URL || window.webkitURL;
    var imageUrl = urlCreator.createObjectURL(blob);
    return imageUrl;
}
function setUItoImage(imageUrl) {
    bgElement.style.backgroundImage = "url('" + imageUrl + "')";
    inputElement.style.display = "none";
    pixelurl = imageUrl;
}
var pixelizeui;
function createInterface(bg) {
    bg.insertAdjacentHTML('beforeend', `<div id="newmenu"><input id="menubutton" aria-label="이미지를 몇 개의 색만을 가지도록 변환합니다. 이 작업은 몇 초 정도 걸립니다." type="button" value="4색 팔레트 만들기!"><input id="menuslider" aria-label="이미지를 변환할 때 사용할 색 개수" type="range" min="2" value="4" max="256"></div>`);
    pixelizeui = {
        div: bg.querySelector('div'),
        submit: bg.querySelector('div > input[type=button]:nth-child(1)'),
        range: bg.querySelector('div > input[type=range]:nth-child(2)'),
    };
    pixelizeui.range.onchange = rangeChanged;
    pixelizeui.submit.onclick = submitPressed;
    return pixelizeui;
    function rangeChanged() {
        pixelizeui.submit.value = pixelizeui.range.value + "색 팔레트 만들기!";
    }
    function submitPressed() {
        pixelizeButton(Number.parseInt(pixelizeui.range.value));
    }
}
function colornizeIfPaletted(data, blob) {
    var colors = rust.read_palette(new Uint8ClampedArray(data));
    if (colors.length != 0) {
        pixeldata = blob;
        createNextInterface(splitColors(colors));
    }
}
var pixeldata = undefined;
var pixelui;
function splitColors(data) {
    var array = [];
    for (var i = 0; i < data.length / 3; i++) {
        var r = data[i * 3].toString(16), g = data[i * 3 + 1].toString(16), b = data[i * 3 + 2].toString(16);
        array.push(`${r}${g}${b}`);
    }
    return array;
}
var url = "";
async function pixelizeButton(colors) {
    var data = await makeCanvas(url);
    quantizeWorker.postMessage([data, colors, 1.0]);
    pixelizeui.submit.disabled = true;
}
quantizeWorker.onmessage = e => {
    pixelizeui.submit.disabled = false;
    var worked = e.data;
    console.log(worked);
    var pixelized = imageBlob(worked.buffer);
    var pixelcolors = splitColors(rust.read_palette(new Uint8ClampedArray(worked)));
    if (pixeldata == undefined) {
        createNextInterface(pixelcolors);
    }
    else {
        modifyNextInterface(pixelcolors);
    }
    pixeldata = pixelized;
    setUItoImage(createUrl(pixelized));
};
async function makeCanvas(blob) {
    const img = document.createElement('img');
    img.src = blob;
    await new Promise((resolve) => (img.onload = resolve));
    const canvas = document.createElement('canvas');
    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0);
    return ctx.getImageData(0, 0, img.width, img.height);
}
function createNextInterface(colors) {
    var value = {
        div: document.createElement('div'),
        button: document.createElement('input'),
        colors: new Array(),
        addColor: (self, newcover) => {
            self.div.insertAdjacentElement("beforeend", newcover);
            self.colors.push(newcover);
        },
    };
    value.div.id = 'palettemenu';
    value.button.id = 'menubutton';
    value.button.type = 'button';
    value.button.value = '다운로드';
    value.button.addEventListener("click", downloadPressed);
    bgElement.insertAdjacentElement("beforeend", value.div);
    value.div.insertAdjacentElement("beforeend", value.button);
    value.button.ariaLabel = `파일 팔레트화가 완료되었습니다. 아래에 변경할 수 있는 색 목록이 있습니다. 색 목록을 변경한 뒤 이 버튼을 눌러주세요.`;
    value.button.focus();
    value.button.addEventListener('focusout', function () {
        this.ariaLabel = `다운로드 버튼. 색 목록을 변경한 뒤 이 버튼을 눌러주세요.`;
    });
    var i = 0;
    colors.forEach(e => {
        var newcover = makeNewcover(e, i);
        value.addColor(value, newcover);
        i++;
    });
    pixelui = value;
    return value;
}
function makeNewcover(color, id) {
    var newcover = document.createElement('input');
    newcover.type = 'color';
    newcover.value = `#${color}`;
    newcover.id = id.toString();
    newcover.addEventListener("change", colorchanged.bind(newcover));
    return newcover;
}
function modifyNextInterface(colors) {
    var value = pixelui;
    for (var i = 0; i < colors.length; i++) {
        if (value.colors.length <= i) {
            var newcover = makeNewcover(colors[i], i);
            value.addColor(value, newcover);
        }
        else {
            value.colors[i].value = `#${colors[i]}`;
        }
    }
    while (colors.length < value.colors.length) {
        var moved = value.colors.pop();
        if (moved instanceof HTMLInputElement) {
            moved.remove();
        }
    }
    value.button.ariaLabel = `파일 팔레트화가 완료되었습니다. 아래에 변경할 수 있는 색 목록이 있습니다. 색 목록을 변경한 뒤 이 버튼을 눌러주세요.`;
    value.button.focus();
}
async function colorchanged() {
    if (pixeldata instanceof Blob) {
        var data = new Uint8ClampedArray(await pixeldata.arrayBuffer());
        var no = Number.parseInt(this.id);
        var color = getRGB(pixelui.colors[no].value);
        var newImage = rust.change_palette(data, Number.parseInt(this.id), color.r, color.g, color.b);
        var blob = imageBlob(newImage);
        pixeldata = blob;
        setUItoImage(createUrl(blob));
    }
}
function getRGB(color) {
    return {
        r: Number.parseInt(`0x${color[1]}${color[2]}`),
        g: Number.parseInt(`0x${color[3]}${color[4]}`),
        b: Number.parseInt(`0x${color[5]}${color[6]}`)
    };
}
var pixelurl = "";
function downloadPressed() {
    var a = document.createElement('a');
    a.download = newName;
    a.href = pixelurl;
    a.click();
}
function makeNewName(oldName) {
    return `${oldName.split('.')[0]}.png`;
}
