// Hàm tiện ích để xáo trộn mảng
function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const sceneContainer = document.getElementById('scene-container');
    const textArea = document.getElementById('text-area');
    const backgroundMusic = document.getElementById('background-music');
    let textsContent = [];

    // --- CÁC THAM SỐ CẤU HÌNH ---
    const FADE_DURATION = 500;
    const ELEMENT_Z_DEPTH_RANGE = 600;      
    const Z_SPEED_EFFECT_STRENGTH = 0.3;   
    const Z_OPACITY_EFFECT_STRENGTH = 0.4; 

    const MAX_ACTIVE_TEXTS = 40;     
    const TEXT_CREATION_INTERVAL = 50; 
    const INITIAL_TEXT_SPAWN_DELAY = 500;
    
    const MAX_ACTIVE_IMAGES = 6; 
    const IMAGE_CREATION_INTERVAL = 2200; 
    const INITIAL_IMAGE_SPAWN_DELAY = 1500;
    const imageFilenames = [
        'assets/images/491217300_1017294157207209_1811657879217783755_n.jpg',
        'assets/images/att.5Dlr-7kJIFIUDUvzTPpGX_lyuUkFm3uHECOa5ME1AN0.jpg',
        'assets/images/att.9cX5K1TmkhLgNT6Ii7FVLQf96BbeUowYFHm1qA0vdR8.jpg',
        'assets/images/att.97z4-AX34ZkO7bttolwd2JSa6ac3PCYvOyD1o70HSOo.jpg',
        'assets/images/att.A4c2OhCGdsseMAVyyM1bLAe6VN4U6uF0JSNTnS-YHWo.jpg',
        'assets/images/att.byCY6SvU0xMgRq-5r9MyAvyYirT2ubaKlzazt2zJoLI.jpg',
        'assets/images/att.GUVmWm2b7haCpoV4bwUuSyQDEd0fA1R1BCrxEV8E8pA.jpg',
        'assets/images/att.IUki3rpZ0ZbzvGT6ikO_U_NBuHOkFkTfrprD25CIyqk.jpg',
        'assets/images/att.MrUXDvWOTR5Y3w3wutrm4mMrEutlDS76mqTTuYq7fts.jpg',
        'assets/images/att.nkHzFg8MwLalPqLMr51ZXAggTXd9fUXlV1JzTL1i64w.jpg',
        'assets/images/att.o3-I82mC4h0NiEiT7GAKXt7T4dWZWG979AMlrzrVggM.jpg'
    ];
    let availableImageIndicesToSpawn = [];
    let currentSpawnIndex = 0;
    const TARGET_APPARENT_IMAGE_WIDTH_DESKTOP = 250;
    const TARGET_APPARENT_IMAGE_WIDTH_MOBILE = 175;
    const MIN_ZOOM_IMAGE_BORDER_WIDTH = 2; 
    const MAX_ZOOM_IMAGE_BORDER_WIDTH = 10;
    const MIN_ZOOM_IMAGE_BORDER_RADIUS = 15;
    const MAX_ZOOM_IMAGE_BORDER_RADIUS = 50;

    let iconsConfig = [];
    const MAX_ACTIVE_ICONS = 4; 
    const ICON_CREATION_INTERVAL = 2800;  
    const INITIAL_ICON_SPAWN_DELAY = 2500;
    
    const PERSPECTIVE_VALUE_FROM_CSS = 1000; 
    const FIXED_SCENE_Z_DEPTH = -1200;     
    
    const MIN_VIEW_SPEED_MULTIPLIER = 1.0;
    const MAX_VIEW_SPEED_MULTIPLIER = 1.0;
    
    let currentRotationX = 5; 
    let currentRotationY = 15; 
    const rotationSensitivityMouse = 0.03;
    const rotationSensitivityTouch = 0.15;
    const maxAngle = 75;
    
    const MIN_SCENE_SCALE = 0.3;
    let currentSceneScale = MIN_SCENE_SCALE; 
    const MAX_SCENE_SCALE = 2.0;
    const ZOOM_SENSITIVITY_MOUSE_WHEEL = 0.03;
    const ZOOM_SENSITIVITY_PINCH = 0.015; 
    
    const TARGET_APPARENT_FONT_SIZE_DESKTOP = 30;
    const TARGET_APPARENT_FONT_SIZE_MOBILE = 22;
    const MIN_EFFECTIVE_FONT_SIZE = 1;
    const MAX_EFFECTIVE_FONT_SIZE = 300; 
    
    const EDGE_FADE_ZONE_RATIO_X = 0;
    const EDGE_FADE_ZONE_RATIO_Y = 0; 
    let edgeFadeZoneX, edgeFadeZoneY_Bottom;

    // DYNAMIC STARS PARAMS
    const MAX_DYNAMIC_STARS = 75; 
    const DYNAMIC_STAR_CREATION_INTERVAL = 150; 
    const INITIAL_DYNAMIC_STAR_SPAWN_DELAY = 300; 
    const MIN_DYNAMIC_STAR_SIZE = 1; 
    const MAX_DYNAMIC_STAR_SIZE = 3; 
    const DYNAMIC_STAR_MAX_LIFETIME = 5000;
    const DYNAMIC_STAR_FADE_OUT_DURATION = 1000; 
    const DYNAMIC_STAR_TWINKLE_SPEED_FACTOR = 0.03;

    let isMouseDown = false, lastMouseX = 0, lastMouseY = 0;
    let isTouching = false, lastTouchX = 0, lastTouchY = 0;
    let isPinching = false, initialPinchDistance = 0;
    let starfieldConfig = {}; 

    function getNextUniqueImageFilename() { if (imageFilenames.length === 0) return null; if (availableImageIndicesToSpawn.length === 0 || currentSpawnIndex >= availableImageIndicesToSpawn.length) { availableImageIndicesToSpawn = Array.from(Array(imageFilenames.length).keys()); shuffleArray(availableImageIndicesToSpawn); currentSpawnIndex = 0; } if (availableImageIndicesToSpawn.length === 0) return null; const filenameIndex = availableImageIndicesToSpawn[currentSpawnIndex]; currentSpawnIndex++; return imageFilenames[filenameIndex]; }
    function calculateEdgeFadeZones() { edgeFadeZoneX = window.innerWidth * EDGE_FADE_ZONE_RATIO_X; edgeFadeZoneY_Bottom = window.innerHeight * EDGE_FADE_ZONE_RATIO_Y; }
    function fetchIconsConfig() { return fetch('icons.ini').then(r => {if(!r.ok) throw new Error('icons.ini load failed'); return r.text()}).then(d => { iconsConfig = d.split('\n').map(l=>l.trim()).filter(l=>l.length>0&&!l.startsWith(';')).map(l=>{const p=l.split('|').map(pt=>pt.trim()); if(p.length===4)return{iconClass:p[0],text:p[1],color:p[2],size:parseInt(p[3],10)||20}; return null;}).filter(c=>c!==null); if(iconsConfig.length===0)console.warn("icons.ini empty/invalid.");}).catch(e=>console.error('icons.ini error:',e));}
    function fetchStarfieldConfig() { return fetch('starfield.ini').then(r=>{if(!r.ok)throw new Error('starfield.ini load failed');return r.text()}).then(d=>{const l=d.split('\n');l.forEach(ln=>{ln=ln.trim();if(ln.length>0&&!ln.startsWith(';')){const p=ln.split('=');if(p.length>=2){const s=p[0].trim();const v=p.slice(1).join('=').trim();if(s&&v)starfieldConfig[s]=v;else console.warn(`Invalid starfield.ini line (selector/value): "${ln}"`);}else if(ln.length>0)console.warn(`Invalid starfield.ini line (missing '='): "${ln}"`);}});if(Object.keys(starfieldConfig).length===0)console.warn("starfield.ini empty/invalid.")}).catch(e=>{console.error('starfield.ini error:',e);starfieldConfig={};});}
    function applyStarfieldStyles() { if (Object.keys(starfieldConfig).length > 0) { const sE=document.createElement('style');sE.type='text/css';let cT="";for(const s in starfieldConfig){if(starfieldConfig.hasOwnProperty(s)){cT+=`${s}{\n  box-shadow:${starfieldConfig[s]};\n}\n`;}} if(sE.styleSheet){sE.styleSheet.cssText=cT;}else{sE.appendChild(document.createTextNode(cT));} document.head.appendChild(sE);} else {console.log("No starfield styles from INI.");}}

    Promise.all([
        fetch('textindex.ini').then(r=>{if(!r.ok)throw new Error('textindex.ini fail');return r.text()}).then(d=>{textsContent=d.split('\n').map(l=>l.trim()).filter(l=>l.length>0);if(textsContent.length===0)textsContent=["Default Text"];}).catch(e=>{console.error('textindex.ini error:',e);textsContent=["Error Text"];}),
        fetchIconsConfig(),
        fetchStarfieldConfig()
    ]).then(() => {
        applyStarfieldStyles();
        initScene();
    }).catch(e => { console.error("Promise.all init error:", e); initScene(); });

    function initScene() {
        calculateEdgeFadeZones();
        window.addEventListener('resize', calculateEdgeFadeZones);
        
        // --- ĐIỀU KHIỂN NHẠC NỀN (PHÁT KHI CLICK/TOUCH ĐẦU TIÊN) ---
        if (backgroundMusic) {
            console.log("[Init] Thẻ audio 'background-music' được tìm thấy. Sẵn sàng phát khi có tương tác.");
            
            const playMusicOnFirstInteraction = () => {
                if (backgroundMusic.paused && backgroundMusic.dataset.playedByInteraction !== 'true') {
                    console.log("[Interaction] Thử phát nhạc sau tương tác.");
                    let playPromise = backgroundMusic.play();
                    if (playPromise !== undefined) {
                        playPromise.then(() => {
                            console.log("[Interaction] Nhạc đã bắt đầu phát thành công.");
                            backgroundMusic.dataset.playedByInteraction = 'true'; 
                            document.removeEventListener('click', playMusicOnFirstInteraction, {capture: true});
                            document.removeEventListener('touchstart', playMusicOnFirstInteraction, {capture: true});
                            document.removeEventListener('keydown', playMusicOnFirstInteraction, {capture: true}); 
                        }).catch(error => {
                            console.warn("[Interaction] Lỗi khi cố gắng phát nhạc sau tương tác:", error);
                        });
                    } else {
                         console.warn("[Interaction] backgroundMusic.play() không trả về promise.");
                    }
                }
            };

            document.addEventListener('click', playMusicOnFirstInteraction, { once: true, capture: true });
            document.addEventListener('touchstart', playMusicOnFirstInteraction, { once: true, capture: true });
            document.addEventListener('keydown', playMusicOnFirstInteraction, { once: true, capture: true });


            document.addEventListener("visibilitychange", () => {
                if (document.visibilityState === 'visible') {
                    if (backgroundMusic.dataset.playedByInteraction === 'true' && backgroundMusic.paused) { 
                       console.log("[Visibility] Tab hiện lại, nhạc đã được cho phép, thử phát lại.");
                       let resumePromise = backgroundMusic.play();
                       if (resumePromise !== undefined) {
                           resumePromise.catch(error => {});
                       }
                    }
                } else {
                    if (!backgroundMusic.paused) { 
                        backgroundMusic.pause();
                        console.log("[Visibility] Tab ẩn, nhạc đã dừng.");
                    }
                }
            });
        } else { 
            console.warn("Thẻ audio 'background-music' không tìm thấy.");
        }
        // --- KẾT THÚC ĐIỀU KHIỂN NHẠC NỀN ---

        if(textsContent.length>0) setTimeout(()=>{if(document.querySelectorAll('.falling-text').length<MAX_ACTIVE_TEXTS)createTextElement();setInterval(createTextElement,TEXT_CREATION_INTERVAL);},INITIAL_TEXT_SPAWN_DELAY);
        if(imageFilenames.length>0) setTimeout(()=>{if(document.querySelectorAll('.falling-image').length<MAX_ACTIVE_IMAGES)createImageElement();setInterval(createImageElement,IMAGE_CREATION_INTERVAL);},INITIAL_IMAGE_SPAWN_DELAY);
        if(iconsConfig.length > 0) setTimeout(() => { if (document.querySelectorAll('.falling-icon-container').length < MAX_ACTIVE_ICONS) createIconElement(); setInterval(createIconElement, ICON_CREATION_INTERVAL); }, INITIAL_ICON_SPAWN_DELAY);
        if(MAX_DYNAMIC_STARS > 0) setTimeout(()=>{for(let i=0; i<Math.min(MAX_DYNAMIC_STARS,20);i++){if(document.querySelectorAll('.dynamic-star').length<MAX_DYNAMIC_STARS)createDynamicStar();} setInterval(createDynamicStar,DYNAMIC_STAR_CREATION_INTERVAL);}, INITIAL_DYNAMIC_STAR_SPAWN_DELAY);
        requestAnimationFrame(animationLoop); sceneContainer.style.cursor='grab'; updateTextAreaTransform();
    }

    function createTextElement(){if(textsContent.length===0||document.querySelectorAll('.falling-text').length>=MAX_ACTIVE_TEXTS)return;const tC=textsContent[Math.floor(Math.random()*textsContent.length)];const tE=document.createElement('div');tE.classList.add('falling-text');tE.textContent=tC;const rLZ=(Math.random()-0.5)*ELEMENT_Z_DEPTH_RANGE;tE.dataset.localZ=rLZ;tE.style.transform=`translateZ(${rLZ}px) translateX(0px) translateY(0px)`;tE.dataset.currentTranslateX=0;tE.dataset.currentTranslateY=0;const tBFS=window.innerWidth>768?TARGET_APPARENT_FONT_SIZE_DESKTOP:TARGET_APPARENT_FONT_SIZE_MOBILE;const sS=Math.max(0.01,currentSceneScale);let cFS=tBFS/sS;cFS=Math.max(MIN_EFFECTIVE_FONT_SIZE,Math.min(MAX_EFFECTIVE_FONT_SIZE,cFS));tE.style.fontSize=`${cFS}px`;const bSRF=Math.random()*500+375;tE.dataset.baseSpeed=bSRF;const rIYP=-(Math.random()*400+20);tE.style.top=`${rIYP}%`;const rIXP=(Math.random()*1000)-500;tE.style.left=`${rIXP}%`;tE.style.opacity="0"; textArea.appendChild(tE);setTimeout(()=>{setTimeout(()=>{tE.style.transition='';},FADE_DURATION);},50);}
    function createImageElement(){if(imageFilenames.length===0||document.querySelectorAll('.falling-image').length>=MAX_ACTIVE_IMAGES)return;const iP=getNextUniqueImageFilename();if(!iP)return;const iE=document.createElement('img');iE.classList.add('falling-image');iE.src=iP;iE.alt="Falling image";const rLZ=(Math.random()-0.5)*ELEMENT_Z_DEPTH_RANGE;iE.dataset.localZ=rLZ;iE.style.transform=`translateZ(${rLZ}px) translateX(0px) translateY(0px)`;iE.dataset.currentTranslateX=0;iE.dataset.currentTranslateY=0;const tBIW=window.innerWidth>768?TARGET_APPARENT_IMAGE_WIDTH_DESKTOP:TARGET_APPARENT_IMAGE_WIDTH_MOBILE;const sS=Math.max(0.01,currentSceneScale);let cW=tBIW/sS;cW=Math.max(30,Math.min(1200,cW));iE.style.width=`${cW}px`;iE.style.height='auto';let nS=0;if(MAX_SCENE_SCALE-MIN_SCENE_SCALE>0.001){nS=(currentSceneScale-MIN_SCENE_SCALE)/(MAX_SCENE_SCALE-MIN_SCENE_SCALE);nS=Math.max(0,Math.min(1,nS));}else if(currentSceneScale>=MAX_SCENE_SCALE)nS=1;const dBW=MIN_ZOOM_IMAGE_BORDER_WIDTH+nS*(MAX_ZOOM_IMAGE_BORDER_WIDTH-MIN_ZOOM_IMAGE_BORDER_WIDTH);const dBR=MIN_ZOOM_IMAGE_BORDER_RADIUS+nS*(MAX_ZOOM_IMAGE_BORDER_RADIUS-MIN_ZOOM_IMAGE_BORDER_RADIUS);iE.style.borderWidth=`${Math.round(dBW)}px`;iE.style.borderRadius=`${Math.round(dBR)}px`;iE.style.borderColor="#BCE1ED";iE.style.borderStyle="solid";const iBSF=(Math.random()*200+200);iE.dataset.baseSpeed=iBSF;const rIYP=-(Math.random()*400+20);iE.style.top=`${rIYP}%`;const rIXP=(Math.random()*800)-400;iE.style.left=`${rIXP}%`; iE.style.opacity="0"; iE.onload=()=>{textArea.appendChild(iE);setTimeout(()=>{setTimeout(()=>{iE.style.transition='';},FADE_DURATION);},50);};iE.onerror=()=>{console.warn(`Failed to load image: ${iP}.`);if(iE.parentNode)iE.parentNode.removeChild(iE);};}
    function createIconElement(){if(iconsConfig.length===0||document.querySelectorAll('.falling-icon-container').length>=MAX_ACTIVE_ICONS)return;const c=iconsConfig[Math.floor(Math.random()*iconsConfig.length)];const iC=document.createElement('div');iC.classList.add('falling-icon-container');const iEl=document.createElement('i');c.iconClass.split(' ').forEach(cl=>iEl.classList.add(cl));iEl.style.color=c.color;const tEl=document.createElement('span');tEl.textContent=c.text;tEl.style.color=c.color;iC.appendChild(iEl);iC.appendChild(tEl);const tBOS=c.size;const sS=Math.max(0.01,currentSceneScale);let cOFS=tBOS/sS;cOFS=Math.max(10,Math.min(80,cOFS));iC.style.fontSize=`${cOFS}px`;iC.style.transform=`translateZ(0px) translateX(0px) translateY(0px)`;iC.dataset.currentTranslateX=0;iC.dataset.currentTranslateY=0;const iBSF=(Math.random()*150+150);iC.dataset.baseSpeed=iBSF;const rIYP=-(Math.random()*350+20);iC.style.top=`${rIYP}%`;const rIXP=(Math.random()*700)-350;iC.style.left=`${rIXP}%`;iC.style.transition='opacity 0.5s ease-in-out';textArea.appendChild(iC);setTimeout(()=>{iC.style.opacity=1;setTimeout(()=>{iC.style.transition='';},FADE_DURATION);},50);}
    function createDynamicStar(){const stars=document.querySelectorAll('.dynamic-star');if(stars.length>=MAX_DYNAMIC_STARS){const oS=stars[0];if(oS)oS.remove();} const s=document.createElement('div');s.classList.add('dynamic-star');const sz=Math.random()*(MAX_DYNAMIC_STAR_SIZE-MIN_DYNAMIC_STAR_SIZE)+MIN_DYNAMIC_STAR_SIZE;s.style.width=`${sz}px`;s.style.height=`${sz}px`;const rLZ=(Math.random()-0.5)*ELEMENT_Z_DEPTH_RANGE*0.3; s.dataset.localZ=rLZ;const iXP=Math.random()*100;const iYP=Math.random()*100;s.style.left=`${iXP}%`;s.style.top=`${iYP}%`;const r=200+Math.floor(Math.random()*56);const g=200+Math.floor(Math.random()*56);const b=220+Math.floor(Math.random()*36);s.style.backgroundColor=`rgb(${r},${g},${b})`;s.style.opacity="0";s.dataset.currentOpacity=Math.random()*0.4+0.3;s.dataset.opacityDirection=(Math.random()<0.5?-1:1)*DYNAMIC_STAR_TWINKLE_SPEED_FACTOR;const sX=(Math.random()-0.5)*60;const sY=(Math.random()-0.5)*60;s.dataset.speedX=sX;s.dataset.speedY=sY;s.dataset.currentTranslateX=0;s.dataset.currentTranslateY=0;const lifetime=Math.random()*(DYNAMIC_STAR_MAX_LIFETIME-2000)+2000; s.dataset.creationTime=performance.now(); s.dataset.lifetime=lifetime;textArea.appendChild(s);}

    let lastFrameTime = 0;
    function animationLoop(currentTime) {
        if (!lastFrameTime) { lastFrameTime = currentTime; requestAnimationFrame(animationLoop); return; }
        const deltaTime = (currentTime - lastFrameTime) / 1000;
        lastFrameTime = currentTime;
        const viewportW = window.innerWidth;
        const viewportH = window.innerHeight;
        const rotX_rad = currentRotationX * Math.PI / 180;
        const rotY_rad = currentRotationY * Math.PI / 180;
        const screenDownLocalX = -Math.sin(rotY_rad) * Math.sin(rotX_rad);
        const screenDownLocalY = Math.cos(rotX_rad);

        function animateFallingElement(selector, elementType) {
            const elementsOnScreen = textArea.querySelectorAll(selector);
            elementsOnScreen.forEach(el => {
                if (!el.parentNode) return;
                let baseSpeed = 0, currentTX = 0, currentTY = 0, localZ = 0;
                let finalSpeedX = 0, finalSpeedY = 0, opacityFromZ = 1.0, elOriginalSize = 20;

                currentTX = parseFloat(el.dataset.currentTranslateX || 0);
                currentTY = parseFloat(el.dataset.currentTranslateY || 0);

                if (elementType === 'text' || elementType === 'image') {
                    baseSpeed = parseFloat(el.dataset.baseSpeed);
                    let elementSpeed = baseSpeed;
                    if (el.dataset.localZ) {
                        localZ = parseFloat(el.dataset.localZ);
                        const halfZRange = ELEMENT_Z_DEPTH_RANGE / 2;
                        if (halfZRange > 0) {
                            const normZ = localZ / halfZRange;
                            elementSpeed = baseSpeed * (1 + normZ * Z_SPEED_EFFECT_STRENGTH);
                            elementSpeed = Math.max(baseSpeed * 0.1, elementSpeed);
                            opacityFromZ = 1 - (Math.max(0, -normZ) * Z_OPACITY_EFFECT_STRENGTH);
                            opacityFromZ = Math.max(0.1, opacityFromZ);
                        }
                    }
                    finalSpeedX = screenDownLocalX * elementSpeed;
                    finalSpeedY = screenDownLocalY * elementSpeed;
                    elOriginalSize = (elementType==='text')?(el.offsetHeight||(parseFloat(el.style.fontSize)||20)):(el.offsetHeight||(parseFloat(el.style.width)*0.75||50));
                } else if (elementType === 'icon') {
                    baseSpeed = parseFloat(el.dataset.baseSpeed);
                    finalSpeedX = screenDownLocalX * baseSpeed;
                    finalSpeedY = screenDownLocalY * baseSpeed;
                    elOriginalSize = el.offsetHeight || (parseFloat(el.style.fontSize) || 20);
                } else if (elementType === 'star') {
                    finalSpeedX = parseFloat(el.dataset.speedX || 0);
                    finalSpeedY = parseFloat(el.dataset.speedY || 0);
                    if(el.dataset.localZ) localZ = parseFloat(el.dataset.localZ);
                    elOriginalSize = parseFloat(el.style.width || 2);
                    
                    let currentOpacity = parseFloat(el.dataset.currentOpacity);
                    let opacityDirection = parseFloat(el.dataset.opacityDirection);
                    const creationTime = parseFloat(el.dataset.creationTime);
                    const lifetime = parseFloat(el.dataset.lifetime);
                    const age = currentTime - creationTime;

                    if (age > lifetime - DYNAMIC_STAR_FADE_OUT_DURATION) { 
                        currentOpacity -= (DYNAMIC_STAR_TWINKLE_SPEED_FACTOR * 3 * deltaTime); 
                    } else {
                        currentOpacity += opacityDirection * deltaTime;
                        if (currentOpacity > 0.9) { currentOpacity = 0.9; opacityDirection *= -1; }
                        if (currentOpacity < 0.2) { currentOpacity = 0.2; opacityDirection *= -1; }
                    }
                    currentOpacity = Math.max(0, Math.min(1, currentOpacity));
                    el.dataset.currentOpacity = currentOpacity;
                    el.dataset.opacityDirection = opacityDirection;
                    opacityFromZ = currentOpacity; 

                    if (age > lifetime) { 
                        if (el.parentNode) el.remove();
                        return;
                    }
                }
                
                currentTX += finalSpeedX * deltaTime;
                currentTY += finalSpeedY * deltaTime;
                el.dataset.currentTranslateX = currentTX;
                el.dataset.currentTranslateY = currentTY;
                el.style.transform = `translateZ(${localZ}px) translateX(${currentTX}px) translateY(${currentTY}px)`;
                
                const rect = el.getBoundingClientRect();
                if (rect.width === 0 && rect.height === 0 && el.dataset.initialRenderAttempted !== "true") {
                    el.dataset.initialRenderAttempted = "true";
                    const estVP = parseFloat(el.style.top);const estVPx=(estVP/100*textArea.offsetHeight)+currentTY;if(estVPx<-viewportH*3||estVPx>viewportH*4){if(el.parentNode)el.remove();return;}
                } else if (rect.width > 0 || rect.height > 0) {
                    let oFE = 1.0; 
                    if (EDGE_FADE_ZONE_RATIO_Y > 0 && rect.bottom > viewportH - edgeFadeZoneY_Bottom) {const pB=Math.min(1,(rect.bottom-(viewportH-edgeFadeZoneY_Bottom))/edgeFadeZoneY_Bottom);oFE=Math.min(oFE,1-pB);}
                    oFE = Math.max(0, oFE);
                    
                    if (elementType !== 'star') { 
                        el.style.opacity = Math.min(oFE, opacityFromZ).toFixed(2);
                    } else {
                         el.style.opacity = opacityFromZ.toFixed(2); 
                    }

                    const rT = elOriginalSize * (elementType === 'star' ? 1 : 1.8);
                    if (parseFloat(el.style.opacity)<=0.01||rect.bottom<-rT||rect.top>viewportH+rT||rect.right<-rT||rect.left>viewportW+rT){if(el.parentNode)el.remove();}
                }
            });
        }
        animateFallingElement('.falling-text', 'text');
        animateFallingElement('.falling-image', 'image');
        animateFallingElement('.falling-icon-container', 'icon');
        animateFallingElement('.dynamic-star', 'star');
        requestAnimationFrame(animationLoop);
    }

    function updateTextAreaTransform() { const tZV = FIXED_SCENE_Z_DEPTH; currentSceneScale = Math.max(MIN_SCENE_SCALE, Math.min(MAX_SCENE_SCALE, currentSceneScale)); currentRotationX = Math.max(-maxAngle, Math.min(maxAngle, currentRotationX)); currentRotationY = Math.max(-maxAngle, Math.min(35, currentRotationY)); textArea.style.transform = `translateZ(${tZV}px) scale(${currentSceneScale}) rotateX(${currentRotationX}deg) rotateY(${currentRotationY}deg)`; }
    sceneContainer.addEventListener('mousedown', (e) => { if (e.button !== 0) return; isMouseDown = true; isPinching = false; isTouching = false; lastMouseX = e.clientX; lastMouseY = e.clientY; sceneContainer.style.cursor = 'grabbing'; });
    document.addEventListener('mousemove', (e) => { if (!isMouseDown) return; const dX = e.clientX - lastMouseX; const dY = e.clientY - lastMouseY; currentRotationY += dX * rotationSensitivityMouse; currentRotationX -= dY * rotationSensitivityMouse; updateTextAreaTransform(); lastMouseX = e.clientX; lastMouseY = e.clientY; });
    document.addEventListener('mouseup', () => { if (isMouseDown) { isMouseDown = false; sceneContainer.style.cursor = 'grab'; } });
    document.addEventListener('mouseleave', () => { if (isMouseDown) { isMouseDown = false; sceneContainer.style.cursor = 'default'; } });
    sceneContainer.addEventListener('mouseenter', () => { if (!isMouseDown && !isTouching && !isPinching) { sceneContainer.style.cursor = 'grab'; } });
    sceneContainer.addEventListener('wheel', (e) => { e.preventDefault(); const d = Math.sign(e.deltaY); currentSceneScale -= d * ZOOM_SENSITIVITY_MOUSE_WHEEL; updateTextAreaTransform(); }, { passive: false });
    sceneContainer.addEventListener('touchstart', (e) => { isMouseDown = false; sceneContainer.style.cursor = 'grabbing'; if (e.touches.length === 1) { isTouching = true; isPinching = false; lastTouchX = e.touches[0].clientX; lastTouchY = e.touches[0].clientY; } else if (e.touches.length === 2) { isTouching = false; isPinching = true; initialPinchDistance = getDistanceBetweenTouches(e.touches); } }, { passive: false });
    sceneContainer.addEventListener('touchmove', (e) => { if (isTouching && e.touches.length === 1) { if (e.cancelable) e.preventDefault(); const tX = e.touches[0].clientX; const tY = e.touches[0].clientY; const dX = tX - lastTouchX; const dY = tY - lastTouchY; currentRotationY += dX * rotationSensitivityTouch; currentRotationX -= dY * rotationSensitivityTouch; updateTextAreaTransform(); lastTouchX = tX; lastTouchY = tY; } else if (isPinching && e.touches.length === 2) { if (e.cancelable) e.preventDefault(); const cPD = getDistanceBetweenTouches(e.touches); const dD = cPD - initialPinchDistance; currentSceneScale += dD * ZOOM_SENSITIVITY_PINCH; updateTextAreaTransform(); initialPinchDistance = cPD; } }, { passive: false });
    sceneContainer.addEventListener('touchend', (e) => { if (isMouseDown) { sceneContainer.style.cursor = 'grabbing';} else if (e.touches.length > 0 && (isTouching || isPinching)) { sceneContainer.style.cursor = 'grabbing';} else { sceneContainer.style.cursor = 'grab';} if (isTouching && e.touches.length === 0) isTouching = false; if (isPinching && e.touches.length < 2) isPinching = false; if (!isPinching && e.touches.length === 1) { isTouching = true; lastTouchX = e.touches[0].clientX; lastTouchY = e.touches[0].clientY; } });
    sceneContainer.addEventListener('touchcancel', () => { isTouching = false; isPinching = false; isMouseDown = false; sceneContainer.style.cursor = 'grab'; });
    function getDistanceBetweenTouches(touches) { const t1 = touches[0]; const t2 = touches[1]; return Math.sqrt( Math.pow(t2.clientX - t1.clientX, 2) + Math.pow(t2.clientY - t1.clientY, 2) ); }
});