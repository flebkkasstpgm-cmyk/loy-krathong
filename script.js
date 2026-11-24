/* script.js - AI Engine V3.20 (Custom Photo Krathong Edition) */

const SHEET_API_URL = "https://script.google.com/macros/s/AKfycbzBUM0P60rsa5gmuGvHfoSLVbqthvLWFyHgxXuOqlEi2eeqEDGYG116w2Ocy9QDakfT/exec"; 

const designs = {
    krathong: ['T1.png', 'T2.png', 'T3.png', 'T4.png', 'T5.png', 'T6.png', 'PHOTO_CUSTOM'],
    lantern: ['C1.png', 'C2.png']
};

let krathongObjects = []; 
let activeIds = new Set(); 
let animationFrameId = null;
let isSubmitting = false;
window.customPhotoBase64 = null;

// --- UTILS ---
function createBackground() {
    const sky = document.getElementById('sky');
    if (sky) {
        sky.innerHTML = '';
        for (let i = 0; i < 50; i++) {
            const star = document.createElement('div');
            star.className = 'star';
            star.style.left = Math.random() * 100 + '%';
            star.style.top = Math.random() * 100 + '%';
            const size = Math.random() * 3 + 'px';
            star.style.width = size; star.style.height = size;
            star.style.animationDelay = Math.random() * 2 + 's';
            sky.appendChild(star);
        }
    }
}

function handlePhotoUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        const img = new Image();
        img.onload = function() {
            // สร้าง Canvas ย่อรูปให้ขนาดพอดีกับกระทง (120x120 px)
            const canvas = document.createElement('canvas');
            const targetSize = 120;
            canvas.width = targetSize;
            canvas.height = targetSize;
            const ctx = canvas.getContext('2d');

            // Crop กึ่งกลางรูป (Center Crop)
            const minDim = Math.min(img.width, img.height);
            const startX = (img.width - minDim) / 2;
            const startY = (img.height - minDim) / 2;

            ctx.drawImage(img, startX, startY, minDim, minDim, 0, 0, targetSize, targetSize);

            // บีบอัดเป็น JPEG ขนาดเบามาก (~5 - 12 KB)
            const compressedBase64 = canvas.toDataURL('image/jpeg', 0.75);
            window.customPhotoBase64 = compressedBase64;
            window.selectedDesign = compressedBase64;

            // แสดงพรีวิว
            const previewWrap = document.getElementById('photo-preview-wrap');
            const previewImg = document.getElementById('photo-preview-img');
            const sizeText = document.getElementById('photo-size-text');
            if (previewWrap && previewImg) {
                previewImg.src = compressedBase64;
                previewWrap.style.display = 'flex';
                const sizeKb = Math.round(compressedBase64.length * 0.75 / 1024);
                if (sizeText) sizeText.innerText = `✨ ย่อรูปสำเร็จ (${sizeKb} KB) พร้อมลอยครับ`;
            }
        };
        img.src = e.target.result;
    };
    reader.readAsDataURL(file);
}

function initForm() {
    createBackground();
    const urlParams = new URLSearchParams(window.location.search);
    const mode = urlParams.get('mode') || 'krathong';
    const title = document.getElementById('form-title');
    const container = document.getElementById('design-container');
    if (title) title.innerText = (mode.toLowerCase() === 'krathong') ? '🌸 เลือกกระทงของคุณ' : '🏮 เลือกโคมของคุณ';
    
    const items = designs[mode.toLowerCase()] || designs.krathong;
    if (items && container) {
        container.innerHTML = '';
        const displayItems = mode.toLowerCase() === 'lantern' ? [items[0]] : items;
        displayItems.forEach((item, index) => {
            const div = document.createElement('div');
            if (item === 'PHOTO_CUSTOM') {
                div.className = 'design-item photo-select-card';
                div.innerHTML = `
                    <div style="font-size: 1.8rem;">📷</div>
                    <span style="font-size: 0.8rem; font-weight: bold; color: var(--gold);">ใส่รูปตัวเอง</span>
                `;
                div.onclick = () => {
                    document.querySelectorAll('.design-item').forEach(d => d.classList.remove('selected'));
                    div.classList.add('selected');
                    const photoSection = document.getElementById('photo-upload-container');
                    if (photoSection) photoSection.style.display = 'block';
                    window.selectedDesign = window.customPhotoBase64 ? window.customPhotoBase64 : 'PHOTO_CUSTOM';
                };
            } else {
                div.className = 'design-item';
                div.innerHTML = item.endsWith('.png') ? `<img src="${item}" style="width: 80px; height: auto;">` : `<span>${item}</span>`;
                div.onclick = () => {
                    document.querySelectorAll('.design-item').forEach(d => d.classList.remove('selected'));
                    div.classList.add('selected');
                    const photoSection = document.getElementById('photo-upload-container');
                    if (photoSection) photoSection.style.display = 'none';
                    window.selectedDesign = item;
                };
            }
            if (index === 0) {
                div.classList.add('selected');
                window.selectedDesign = item;
            }
            container.appendChild(div);
        });
    }
}

async function startFloating() {
    if (isSubmitting) return;
    const name = document.getElementById('user-name').value.trim();
    const msg = document.getElementById('user-msg').value.trim();
    const mode = new URLSearchParams(window.location.search).get('mode') || 'krathong';
    
    if (!name || !msg) { alert('กรุณากรอกชื่อและคำอธิษฐานครับเจ้านาย'); return; }

    // ตรวจสอบกรณีเลือกกระทงรูปตัวเอง แต่ยังไม่ได้อัปโหลดรูป
    if (window.selectedDesign === 'PHOTO_CUSTOM' || (document.querySelector('.photo-select-card.selected') && !window.customPhotoBase64)) {
        alert('กรุณาเลือกรูปภาพสำหรับกระทงรูปของคุณก่อนเริ่มลอยครับ 📷');
        return;
    }

    isSubmitting = true;
    let design = window.selectedDesign || (mode === 'krathong' ? 'T1.png' : 'C1.png');
    const isPhoto = design.startsWith('data:image/') || design.startsWith('http');
    if (!isPhoto && !design.endsWith('.png')) {
        design += '.png';
    }

    const data = { mode, name, msg, design };

    if (SHEET_API_URL) {
        try {
            await fetch(SHEET_API_URL, {
                method: 'POST', mode: 'no-cors',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
        } catch (e) { console.error("Cloud Save Error:", e); }
    }
    
    window.location.href = 'animation.html';
}

// --- ENGINE ---
const CANAL = { minY: 2, maxY: 5, spacing: 140 }; 

function createKrathong(data, isUser = false, isNew = false) {
    const isPhoto = data.design.startsWith('data:image/') || data.design.startsWith('http');
    const cleanDesign = isPhoto ? data.design : (data.design.endsWith('.png') ? data.design : data.design + '.png');
    const dataKey = "KRATHONG_" + data.name + data.msg + (isPhoto ? cleanDesign.slice(0, 40) : cleanDesign);
    if (activeIds.has(dataKey)) return;
    activeIds.add(dataKey);

    const area = document.getElementById('float-area');
    if (!area) return;
    const el = document.createElement('div');
    el.className = 'floating-obj krathong-item';
    
    const visualContent = isPhoto 
        ? `<div class="photo-krathong-unit">
               <div class="photo-candle-flame">🪔</div>
               <div class="photo-frame-box">
                   <img src="${cleanDesign}" class="photo-krathong-img" alt="รูปผู้ลอย">
               </div>
               <div class="photo-lotus-base"></div>
           </div>`
        : `<img src="${cleanDesign}" class="krathong-img">`;

    el.innerHTML = `
        <div class="krathong-wrap">
            <div class="ripple"></div>
            <div class="reflection"></div>
            <div class="wake"></div>
            ${visualContent}
        </div>
        <div class="obj-info">
            <strong>${data.name}</strong><br>
            <span style="font-size: 0.7rem;">${data.msg}</span>
        </div>`;

    const krathong = {
        el,
        x: isNew ? -400 : (Math.random() * (window.innerWidth + 600) - 300),
        baseY: Math.random() * (CANAL.maxY - CANAL.minY) + CANAL.minY,
        y: 0,
        speed: 0.3 + Math.random() * 0.4,
        amplitude: 2.0 + Math.random() * 2.0,
        frequency: 0.007 + Math.random() * 0.005,
        phase: Math.random() * Math.PI * 2,
        isUser
    };
    
    el.style.opacity = 1;
    el.style.left = '0px';
    area.appendChild(el);
    krathongObjects.push(krathong);
}

function createLantern(data, container, isNew = false) {
    const isPhoto = data.design.startsWith('data:image/') || data.design.startsWith('http');
    let cleanDesign = isPhoto ? data.design : (data.design.endsWith('.png') ? data.design : data.design + '.png');
    if (!isPhoto && cleanDesign.startsWith('T')) cleanDesign = 'C1.png'; 
    
    const dataKey = "LANTERN_" + data.name + data.msg + (isPhoto ? cleanDesign.slice(0, 40) : cleanDesign);
    if (activeIds.has(dataKey)) return;
    activeIds.add(dataKey);

    const obj = document.createElement('div');
    obj.className = 'floating-obj lantern-item';
    
    // สุ่มตำแหน่ง X และ Y เริ่มต้น
    const startX = (Math.random() * 90 + 5);
    const startY = 30 + (Math.random() * 25); 
    const endX = startX + (Math.random() * 20 - 10); 
    
    obj.style.setProperty('--start-x', startX + '%');
    obj.style.setProperty('--end-x', endX + '%');
    obj.style.setProperty('--start-y', startY + '%');
    
    const duration = 35 + Math.random() * 45;
    const delay = isNew ? (Math.random() * 15) : (Math.random() * 60); 
    
    obj.style.animation = `moveLantern ${duration}s infinite linear backwards`;
    obj.style.animationDelay = delay + 's';
    
    const visualContent = isPhoto 
        ? `<div class="photo-frame-box" style="border-radius: 50%;"><img src="${cleanDesign}" class="photo-krathong-img"></div>`
        : `<img src="${cleanDesign}" class="lantern-img">`;

    obj.innerHTML = `${visualContent}
        <div class="obj-info">
            <strong>${data.name}</strong><br>
            <span style="font-size: 0.7rem;">${data.msg}</span>
        </div>`;
    container.appendChild(obj);
}

function updateKrathongPositions() {
    const screenWidth = window.innerWidth;
    krathongObjects.forEach(k => {
        k.x += k.speed;
        k.y = k.baseY + Math.sin(k.x * k.frequency + k.phase) * k.amplitude;
        if (k.x > screenWidth + 500) {
            k.x = -600;
            k.baseY = Math.random() * (CANAL.maxY - CANAL.minY) + CANAL.minY;
        }
        k.el.style.transform = `translateX(${k.x}px)`;
        k.el.style.bottom = k.y + '%';
        k.el.style.zIndex = Math.floor(50 - k.y);
    });
    animationFrameId = requestAnimationFrame(updateKrathongPositions);
}

function launchBoat(data) {
    const area = document.getElementById('float-area');
    if (!area || !data) return;

    const boat = document.createElement('div');
    boat.className = 'boat-item';
    
    // ปรับให้วิ่งในแม่น้ำ (5% - 25% จากขอบล่าง)
    const boatY = 5 + Math.random() * 15;
    boat.style.setProperty('--boat-y', boatY + '%');
    
    const duration = 8 + Math.random() * 4;
    boat.style.animation = `moveBoat ${duration}s linear forwards`;

    // ตรวจสอบโหมดเพื่อประกาศให้ถูกต้อง
    const actionText = (data.mode && data.mode.toLowerCase() === 'lantern') ? 'ลอยโคมยี่เป็ง' : 'ลอยกระทง';

    boat.innerHTML = `
        <div class="boat-info">📣 ${data.name} กำลัง${actionText}!</div>
        <div class="boat-wake"></div>
        <img src="boat.png" class="boat-img">
    `;

    area.appendChild(boat);
    setTimeout(() => boat.remove(), duration * 1000);
}

async function syncCloudData(isInitial = false) {
    if (!SHEET_API_URL) return;
    try {
        const resp = await fetch(SHEET_API_URL);
        const data = await resp.json();
        const area = document.getElementById('float-area');
        if (data && Array.isArray(data)) {
            data.forEach(item => {
                const isPhoto = item.design && (item.design.startsWith('data:image/') || item.design.startsWith('http'));
                const cleanDesign = isPhoto ? item.design : (item.design.endsWith('.png') ? item.design : item.design + '.png');
                const dataKey = (item.mode.toLowerCase() === 'krathong' ? "KRATHONG_" : "LANTERN_") + item.name + item.msg + (isPhoto ? cleanDesign.slice(0, 40) : cleanDesign);
                
                if (!activeIds.has(dataKey)) {
                    if (!isInitial) {
                        launchBoat(item);
                        setTimeout(() => {
                            if (item.mode.toLowerCase() === 'krathong') createKrathong(item, false, true);
                            else createLantern(item, area, true);
                        }, 1000);
                    } else {
                        if (item.mode.toLowerCase() === 'krathong') createKrathong(item, false, false);
                        else createLantern(item, area, false);
                    }
                }
            });
        }
    } catch (e) { console.error("Sync Error:", e); }
}

function createWaves() {
    const area = document.getElementById('float-area');
    if (!area) return;
    for (let i = 0; i < 40; i++) { 
        const wave = document.createElement('div');
        wave.className = 'water-wave';
        wave.style.left = Math.random() * 100 + '%';
        wave.style.top = (70 + Math.random() * 30) + '%'; 
        wave.style.width = (100 + Math.random() * 200) + 'px';
        wave.style.animationDuration = (3 + Math.random() * 5) + 's';
        wave.style.animationDelay = Math.random() * 5 + 's';
        area.appendChild(wave);
    }
}

function launchFirework() {
    const sky = document.getElementById('sky');
    if (!sky) return;

    const launcher = document.createElement('div');
    launcher.className = 'firework-launcher';
    
    const startX = Math.random() * 100;
    const targetY = 10 + Math.random() * 40; 
    const launchDuration = 1 + Math.random() * 0.5; 

    launcher.style.left = startX + '%';
    launcher.style.top = targetY + '%';
    launcher.style.setProperty('--duration', launchDuration + 's');
    sky.appendChild(launcher);

    setTimeout(() => {
        launcher.remove();
        const flash = document.createElement('div');
        flash.className = 'explosion-flash';
        flash.style.left = startX + '%';
        flash.style.top = targetY + '%';
        sky.appendChild(flash);
        setTimeout(() => flash.remove(), 300);

        const firework = document.createElement('div');
        firework.className = 'firework';
        firework.style.left = startX + '%';
        firework.style.top = targetY + '%';
        
        const colors = ['#ffcc33', '#ff3366', '#33ff66', '#33ccff', '#ffffff', '#ff99ff', '#ffff00'];
        const color = colors[Math.floor(Math.random() * colors.length)];
        
        const sparkCount = 50 + Math.floor(Math.random() * 20);
        for (let i = 0; i < sparkCount; i++) {
            const spark = document.createElement('div');
            spark.className = 'spark';
            
            const angle = (i * (360 / sparkCount)) + (Math.random() * 15);
            const distance = 60 + Math.random() * 100; 
            const duration = 1.5 + Math.random() * 1.5; 
            const size = 2 + Math.random() * 3; 
            
            spark.style.setProperty('--angle', angle + 'deg');
            spark.style.setProperty('--distance', distance + 'px');
            spark.style.setProperty('--duration', duration + 's');
            spark.style.setProperty('--color', color);
            spark.style.setProperty('--size', size + 'px');
            
            firework.appendChild(spark);
        }

        sky.appendChild(firework);
        setTimeout(() => firework.remove(), 4000);
    }, launchDuration * 900);
}

async function startAnimation() {
    createBackground();
    const area = document.getElementById('float-area');
    if (!area) return;
    area.innerHTML = '';
    krathongObjects = [];
    activeIds.clear();
    if (animationFrameId) cancelAnimationFrame(animationFrameId);

    createWaves(); 
    await syncCloudData(true);

    setInterval(() => syncCloudData(false), 5000); 
    setInterval(launchFirework, 3500); 
    
    updateKrathongPositions();
}

document.addEventListener('DOMContentLoaded', () => {
    if (document.body.id === 'animation-page' || document.getElementById('float-area')) startAnimation();
});
