// --- Globais ---
const canvas = document.getElementById('canvas-calibrate');
const ctx = canvas.getContext('2d');
canvas.width = 800; canvas.height = 450;

let image = null;
let cropper = null;
let points = []; 
let currentU = null, currentV = null;
let hoverU = null, hoverV = null;
let isCtrlPressed = false;

let colorlist = [
  "#e8370f","#22FF57","#3397FF","#F1C40F",
  "#9B59B6","#370C9C","#149a7d","#9ff5de",
  "#FA98DB","#5a0460","#BDC3C7","#34495E",
  "#e4f320","#b2620d","#AF00A9","#075343",
  "#053117","#2980B9","#9d70dc","#2C3E50"
];

// --- Upload de Imagens ---
const fileInput = document.getElementById('image-upload');
const cropModal = document.getElementById('crop-modal');
const imageToCrop = document.getElementById('image-to-crop');
const btnConfirmCrop = document.getElementById('btn-confirm-crop');
const btnCancelCrop = document.getElementById('btn-cancel-crop');

// Imagem inserida
fileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    const url = URL.createObjectURL(file);
    imageToCrop.src = url;

    cropModal.style.display = 'flex';
    if (cropper) cropper.destroy();
    
    cropper = new Cropper(imageToCrop, {
        aspectRatio: 16/9,
        viewMode: 1,
        autoCropArea: 1,
        background: false
    });
    e.target.value = ''; 
});

// Cancelar
btnCancelCrop.addEventListener('click', () => {
    cropModal.style.display = 'none';
    if (cropper) cropper.destroy();
});

// Aplicar
btnConfirmCrop.addEventListener('click', () => {
    if (!cropper) return;
    const croppedCanvas = cropper.getCroppedCanvas({ width: 800, height: 450 });
    image = new Image();
    image.onload = () => {
        cropModal.style.display = 'none';
        draw();
    };
    image.src = croppedCanvas.toDataURL();
});

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (image) {
        ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
    }
    points.forEach((p, index) => {
        ctx.fillStyle = colorlist[index%20]
        ctx.beginPath(); 
        ctx.arc(p.u, p.v, 4, 0, Math.PI*2); 
        ctx.fill();
    });
    if (currentU !== null && currentV !== null) {
        ctx.strokeStyle = '#fff';  ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(currentU - 10, currentV); ctx.lineTo(currentU + 10, currentV);
        ctx.moveTo(currentU, currentV - 10); ctx.lineTo(currentU, currentV + 10);
        ctx.stroke();
    }
    if (isCtrlPressed && hoverU !== null && hoverV !== null && image) {
        const zoom = 3, radius = 60;

        ctx.save(); ctx.beginPath();
        ctx.arc(hoverU, hoverV, radius, 0, Math.PI*2);
        ctx.clip(); ctx.fillStyle = "#000"; ctx.fill();
        const size = (radius*2)/zoom;
        ctx.drawImage(image, hoverU - (size/2), hoverV - (size/2), size, size,hoverU - radius, hoverV - radius, radius*2, radius*2);

        ctx.strokeStyle = "rgba(0, 255, 0, 0.5)"; ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(hoverU - radius, hoverV); ctx.lineTo(hoverU + radius, hoverV);
        ctx.moveTo(hoverU, hoverV - radius); ctx.lineTo(hoverU, hoverV + radius);
        ctx.stroke(); ctx.restore();
        ctx.strokeStyle = "#fff"; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc(hoverU, hoverV, radius, 0, Math.PI*2); ctx.stroke();
    }
}

// --- Mapeamento de Pontos ---
const display2D = document.getElementById('display-2d');
const btnAdd = document.getElementById('btn-add');
const btnClean = document.getElementById('pt-clean');
const btnCalc = document.getElementById('btn-calc');

// Seleção de Coordenada
canvas.addEventListener('mousedown', (e) => {
    const rect = canvas.getBoundingClientRect();
    currentU = (e.clientX - rect.left)*(canvas.width/rect.width);
    currentV = (e.clientY - rect.top)*(canvas.height/rect.height);
    display2D.innerText = `(${currentU.toFixed(1)}, ${currentV.toFixed(1)})`;
    draw(); 
});

// Registrar Ponto
btnAdd.addEventListener('click', () => {
    if (currentU === null || currentV === null) {
        alert("Clique na imagem para capturar uma coordenada 2D.");
        return;
    }
    const x = parseFloat(document.getElementById('ponto-x').value);
    const y = parseFloat(document.getElementById('ponto-y').value);
    const z = parseFloat(document.getElementById('ponto-z').value);

    let repeated = false;
    points.forEach((p,index) => {
        if(p.x == x && p.y == y && p.z == z) repeated = true;
    });
    if(repeated){
        alert("Ponto já registrado");
        return;
    }
    points.push({ u: currentU, v: currentV, x, y, z });
    
    currentU = null; currentV = null;
    display2D.innerText = "(Aguardando)";
    updatePointsUI(); draw();
});

// Limpar Pontos
btnClean.addEventListener('click', () => {
    points = [];
    updatePointsUI(); draw();
});

// --- Zoom na Seleção de Pontos ---
window.addEventListener('keydown', (e) => {
    if (e.key === 'Control') {
        isCtrlPressed = true; draw();
    }
});
window.addEventListener('keyup',   (e) => {
    if (e.key === 'Control') {
        isCtrlPressed = false; draw();
    }
});
canvas.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    hoverU = (e.clientX - rect.left)*(canvas.width/rect.width);
    hoverV = (e.clientY - rect.top)*(canvas.height/rect.height);
    if (isCtrlPressed) draw();
});

canvas.addEventListener('mouseleave', () => {
    hoverU = null; hoverV = null; draw();
});

// --- Processamento de Resultados ---

// Atualiza a Lista de Pontos
function updatePointsUI() {
    const ul = document.getElementById('pt-list');
    ul.innerHTML = '';
    
    points.forEach((p, i) => {
        const li = document.createElement('li');
        li.innerHTML = `<span>P${i}: (${p.u.toFixed(0)}, ${p.v.toFixed(0)}) ➔ (${p.x}, ${p.y}, ${p.z})</span>`;
        
        const btnDel = document.createElement('button');
        btnDel.className = 'delete-btn';
        btnDel.innerText = '✖';
        btnDel.onclick = () => {
            points.splice(i, 1);
            updatePointsUI();
            draw();
        };
        
        li.appendChild(btnDel);
        ul.appendChild(li);
    });
    
    const count = points.length;
    document.getElementById('counter').innerText = count;
    btnClean.style.display = count > 0 ? 'block' : 'none';
    btnCalc.disabled = (count < 6);
}

// Formatação da Matriz de Projeção
function formatMatrixHTML(matrix) {
    let html = "<table class='matrix-table'>";
    matrix.forEach(row => {
        html += "<tr>";
        row.forEach(val => html += `<td class='matrix-cell'>${val.toFixed(4)}</td>`);
        html += "</tr>";
    });
    html += "</table>";
    return html;
}

// Exibição dos Resultados do DLT
btnCalc.addEventListener('click', () => {
    // Matriz de Projeção
    P = calculateDLT(points);
    if (!P) return alert("Erro no cálculo da matriz de projeção.");
    document.getElementById('matrix-log').innerHTML = `<span class="matrix-title">Matriz de Projeção:</span><br>${formatMatrixHTML(P)}`;

    // Extração de Parâmetros
    try {
        const params = paramExtraction(P);
        let fov = 2 * Math.atan((canvas.height / 2) / params.len.fy) * (180 / Math.PI);
        let aspect = params.len.fy / params.len.fx;

        document.getElementById('out-pos').innerHTML = 
        `<strong class="mini">(X, Y, Z):</strong> <span class="val-pos">${params.pos[0].toFixed(2)}, ${params.pos[1].toFixed(2)}, ${params.pos[2].toFixed(2)}</span>`;
        document.getElementById('out-rot').innerHTML = 
        `<strong class="mini">(Pitch, Yaw, Roll):</strong> <span class="val-rot">${params.ang.pitch.toFixed(1)}°, ${params.ang.yaw.toFixed(1)}°, ${params.ang.roll.toFixed(1)}°</span>`;
        document.getElementById('out-len').innerHTML = 
        `<strong class="mini">(FOV, Aspect Ratio):</strong> <span class="val-len">${fov.toFixed(1)}°, ${aspect.toFixed(2)}</span>`;
        document.getElementById('log-params').style.display = 'block';
    } catch (e) {
        document.getElementById('out-pos').innerHTML = `<span class="val-err">Erro na decomposição: Pontos coplanares selecionados.</span>`;
        document.getElementById('out-rot').innerHTML = "";
        document.getElementById('out-len').innerHTML = "";
        document.getElementById('log-params').style.display = 'block';
    }
    draw();
});

// --- Execução Inicial ---
draw();