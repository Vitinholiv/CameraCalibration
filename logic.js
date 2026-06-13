// --- Globais ---
const canvas = document.getElementById('canvas-calibrate');
const ctx = canvas.getContext('2d');
canvas.width = 800; canvas.height = 450;

let image = null;
let cropper = null;

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
        aspectRatio: 16 / 9,
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
}

// --- Execução ---
draw();