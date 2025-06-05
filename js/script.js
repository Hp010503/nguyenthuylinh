// Hàm tiện ích để xáo trộn thứ tự các phần tử trong một mảng (Fisher-Yates shuffle)
// Được sử dụng để lấy ảnh không lặp lại trong một chu kỳ.
function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]]; // Hoán đổi phần tử
    }
}

// Sự kiện này đảm bảo rằng tất cả HTML đã được tải và cây DOM đã sẵn sàng trước khi script chạy.
document.addEventListener('DOMContentLoaded', () => {
    // Lấy các phần tử DOM quan trọng từ HTML để tương tác
    const sceneContainer = document.getElementById('scene-container');
    const textArea = document.getElementById('text-area');
    const backgroundMusic = document.getElementById('background-music');

    let textsContent = [];
    const FADE_DURATION = 500;
    const ELEMENT_Z_DEPTH_RANGE = 2000;
    const Z_SPEED_EFFECT_STRENGTH = 0.3;
    const Z_OPACITY_EFFECT_STRENGTH = 0.4;
    const MAX_ACTIVE_TEXTS = 70;
    const TEXT_CREATION_INTERVAL = 200;
    const INITIAL_TEXT_SPAWN_DELAY = 500;

    const MAX_ACTIVE_IMAGES = 8;
    const IMAGE_CREATION_INTERVAL = 1500;
    const INITIAL_IMAGE_SPAWN_DELAY = 1500;

    // ----- THAY ĐỔI BẮT ĐẦU TỪ ĐÂY -----
    let imageFilenames = []; // Sẽ được điền bởi getImagesFromGoogleDrive hoặc từ file mặc định nếu lỗi
    
    // Thay thế bằng Folder ID và API Key của bạn
    const GOOGLE_DRIVE_FOLDER_ID = '1bxxhAhwMyDNJR1JzTWyCfxBLyt-zY1lI'; // <- YOUR GOOGLE DRIVE FOLDER ID
    const GOOGLE_API_KEY = 'AIzaSyDEwpE5-fmA3SXa6f5AsN43i1B_RVILK5Y';   // <- YOUR GOOGLE API KEY (CẢNH BÁO BẢO MẬT)

    // Mảng ảnh mặc định phòng trường hợp không lấy được từ Google Drive
    const defaultLocalImageFilenames = [
        'assets/images/491217300_1017294157207209_1811657879217783755_n.jpg',
        'assets/images/att.5Dlr-7kJIFIUDUvzTPpGX_lyuUkFm3uHECOa5ME1AN0.jpg',
        'assets/images/att.9cX5K1TmkhLgNT6Ii7FVLQf96BbeUowYFHm1qA0vdR8.jpg',
        // Thêm các đường dẫn ảnh cục bộ khác nếu bạn muốn làm fallback
    ];

    async function getImagesFromGoogleDrive() {
        if (!GOOGLE_API_KEY || !GOOGLE_DRIVE_FOLDER_ID) {
            console.warn("Google API Key or Folder ID is missing. Falling back to local default images.");
            return defaultLocalImageFilenames;
        }

        const url = `https://www.googleapis.com/drive/v3/files?q='${GOOGLE_DRIVE_FOLDER_ID}'+in+parents+and+trashed=false&key=${GOOGLE_API_KEY}&fields=files(id,name,mimeType,webContentLink,webViewLink)`;
        
        try {
            const res = await fetch(url);
            if (!res.ok) {
                const errorData = await res.json().catch(() => ({ message: "Unknown API error, no JSON response." }));
                console.error('Google Drive API error:', res.status, errorData.error ? errorData.error.message : errorData.message);
                throw new Error(`Google Drive API request failed: ${res.status}. ${errorData.error ? errorData.error.message : errorData.message}`);
            }
            const data = await res.json();

            if (data.files && data.files.length > 0) {
                const images = data.files.filter(file => file.mimeType && file.mimeType.startsWith('image/'));
                // Ưu tiên webContentLink để tải trực tiếp, nếu không có dùng webViewLink (cần chỉnh sửa để hiển thị)
                // hoặc link dạng `uc?export=view&id=`
                const imgLinks = images.map(img => {
                    // Quan trọng: Đảm bảo các file trên Drive được chia sẻ công khai (Anyone with the link can view)
                    return `https://drive.google.com/uc?export=view&id=${img.id}`;
                });
                
                console.log("Images loaded from Google Drive:", imgLinks.length, "images found.");
                if (imgLinks.length === 0) {
                    console.warn("No image files found in the specified Google Drive folder (or they are not shared correctly / not image types). Falling back to local default images.");
                    return defaultLocalImageFilenames;
                }
                return imgLinks;
            } else {
                console.warn('No files found in Google Drive folder or folder is not public/accessible, or the API key/folder ID is incorrect. Falling back to local default images.');
                return defaultLocalImageFilenames;
            }
        } catch (error) {
            console.error('Error fetching images from Google Drive:', error);
            console.warn("Falling back to local default images due to an error.");
            return defaultLocalImageFilenames;
        }
    }
    // ----- THAY ĐỔI KẾT THÚC TẠI ĐÂY -----

    let availableImageIndicesToSpawn = [];
    let currentSpawnIndex = 0;
    const TARGET_APPARENT_IMAGE_WIDTH_DESKTOP = 250;
    const TARGET_APPARENT_IMAGE_WIDTH_MOBILE = 150;

    const MIN_ZOOM_IMAGE_BORDER_WIDTH = 2;
    const MAX_ZOOM_IMAGE_BORDER_WIDTH = 50;
    const MIN_ZOOM_IMAGE_BORDER_RADIUS = 5;
    const MAX_ZOOM_IMAGE_BORDER_RADIUS = 300;

    let iconsConfig = [];
    const MAX_ACTIVE_ICONS = 4;
    const ICON_CREATION_INTERVAL = 2800;
    const INITIAL_ICON_SPAWN_DELAY = 2500;

    const PERSPECTIVE_VALUE_FROM_CSS = 1000;
    const FIXED_SCENE_Z_DEPTH = -1000;

    // ... (các hằng số và biến khác giữ nguyên) ...

    let isMouseDown = false, lastMouseX = 0, lastMouseY = 0;
    let isTouching = false, lastTouchX = 0, lastTouchY = 0;
    let isPinching = false, initialPinchDistance = 0;

    let starfieldConfig = {};

    function getNextUniqueImageFilename() {
        if (imageFilenames.length === 0) {
            // console.warn("imageFilenames is empty. Cannot get next image."); // Bỏ comment nếu muốn debug
            return null;
        }
        if (availableImageIndicesToSpawn.length === 0 || currentSpawnIndex >= availableImageIndicesToSpawn.length) {
            availableImageIndicesToSpawn = Array.from(Array(imageFilenames.length).keys());
            shuffleArray(availableImageIndicesToSpawn);
            currentSpawnIndex = 0;
        }
        if (availableImageIndicesToSpawn.length === 0) return null; // Trường hợp hi hữu
        const filenameIndex = availableImageIndicesToSpawn[currentSpawnIndex];
        currentSpawnIndex++;
        return imageFilenames[filenameIndex];
    }

    function calculateEdgeFadeZones() {
        edgeFadeZoneX = window.innerWidth * EDGE_FADE_ZONE_RATIO_X;
        edgeFadeZoneY_Bottom = window.innerHeight * EDGE_FADE_ZONE_RATIO_Y;
    }

    function fetchIconsConfig() {
        return fetch('icons.ini')
            .then(r => {if(!r.ok) throw new Error('icons.ini load failed'); return r.text()})
            .then(d => {
                iconsConfig = d.split('\n').map(l=>l.trim()).filter(l=>l.length>0&&!l.startsWith(';'))
                .map(l=>{const p=l.split('|').map(pt=>pt.trim()); if(p.length===4)return{iconClass:p[0],text:p[1],color:p[2],size:parseInt(p[3],10)||20}; console.warn(`Invalid icons.ini line: "${l}"`); return null;})
                .filter(c=>c!==null);
                if(iconsConfig.length===0)console.warn("icons.ini empty or invalid format.");
            }).catch(e=>{console.error('icons.ini fetch error:',e); iconsConfig = []; /* Ensure it's an array on error */});
    }

    function fetchStarfieldConfig() {
        return fetch('starfield.ini')
            .then(r=>{if(!r.ok)throw new Error('starfield.ini load failed');return r.text()})
            .then(d=>{
                const l=d.split('\n');
                l.forEach(ln=>{
                    ln=ln.trim();
                    if(ln.length>0&&!ln.startsWith(';')){
                        const p=ln.split('=');
                        if(p.length>=2){
                            const s=p[0].trim();
                            const v=p.slice(1).join('=').trim();
                            if(s&&v)starfieldConfig[s]=v;
                            else console.warn(`Invalid starfield.ini line (missing selector or value): "${ln}"`);
                        }else if(ln.length>0)console.warn(`Invalid starfield.ini line (missing '='): "${ln}"`);
                    }
                });
                if(Object.keys(starfieldConfig).length===0)console.warn("starfield.ini empty or invalid format.")
            }).catch(e=>{console.error('starfield.ini fetch error:',e);starfieldConfig={}; });
    }

    function applyStarfieldStyles() {
        if (Object.keys(starfieldConfig).length > 0) {
            const sE=document.createElement('style');sE.type='text/css';let cT="";
            for(const s in starfieldConfig){if(starfieldConfig.hasOwnProperty(s)){cT+=`${s} {\n  box-shadow: ${starfieldConfig[s]};\n}\n`;}}
            if(sE.styleSheet){sE.styleSheet.cssText=cT;}else{sE.appendChild(document.createTextNode(cT));}
            document.head.appendChild(sE);
            console.log("Starfield styles from INI applied.");
        } else {console.log("No starfield styles from INI to apply (or file error). Check starfield.ini content.");}
    }

    // Sửa đổi Promise.all để bao gồm việc lấy ảnh từ Google Drive
    Promise.all([
        fetch('textindex.ini')
            .then(r=>{if(!r.ok)throw new Error('textindex.ini load failed');return r.text()})
            .then(d=>{textsContent=d.split('\n').map(l=>l.trim()).filter(l=>l.length>0);if(textsContent.length===0)textsContent=["Default Text Line"];})
            .catch(e=>{console.error('textindex.ini fetch error:',e);textsContent=["Error Loading Texts"];}),
        fetchIconsConfig(),
        fetchStarfieldConfig(),
        getImagesFromGoogleDrive() // Gọi hàm lấy ảnh từ Google Drive
    ]).then((results) => {
        // results[3] sẽ chứa mảng các URL ảnh từ Google Drive (hoặc ảnh mặc định nếu có lỗi)
        if (results[3] && Array.isArray(results[3])) {
            imageFilenames = results[3];
            if (imageFilenames.length > 0 && imageFilenames !== defaultLocalImageFilenames) {
                 console.log("Successfully populated imageFilenames with", imageFilenames.length, "images from Google Drive.");
            } else if (imageFilenames === defaultLocalImageFilenames) {
                console.log("Using local default images as fallback. Count:", imageFilenames.length);
            } else {
                 console.warn("Google Drive image fetching resulted in an empty list, though successful. Check folder content/sharing.");
            }
        } else {
            console.error("Failed to get images from Google Drive or result was not an array. Using default local images.");
            imageFilenames = defaultLocalImageFilenames; // Đảm bảo có fallback
        }

        applyStarfieldStyles();
        initScene();
    }).catch(e => {
        console.error("Critical error during initial file fetching (Promise.all):", e);
        console.warn("Attempting to initialize scene with default/fallback values.");
        // Fallback cứng nếu Promise.all thất bại hoàn toàn
        imageFilenames = imageFilenames.length > 0 ? imageFilenames : defaultLocalImageFilenames; // Nếu imageFilenames đã được set từ getImages... (trong trường hợp getImages thành công nhưng các promise khác lỗi)
        textsContent = textsContent.length > 0 ? textsContent : ["Error Loading Content"];
        iconsConfig = iconsConfig.length > 0 ? iconsConfig : [];

        applyStarfieldStyles(); // Vẫn cố áp dụng style
        initScene(); // Vẫn cố khởi tạo scene
    });

    function initScene() {
        calculateEdgeFadeZones();
        window.addEventListener('resize', calculateEdgeFadeZones);

        if (backgroundMusic) {
            console.log("[Init] Thẻ audio 'background-music' được tìm thấy. Sẵn sàng phát khi có tương tác.");
            const playMusicOnFirstInteraction = () => {
                if (backgroundMusic.paused && backgroundMusic.dataset.playedByInteraction !== 'true') {
                    // ... (code phát nhạc giữ nguyên)
                }
            };
            // ... (các event listener cho nhạc giữ nguyên)
        } else {
            console.warn("Thẻ audio 'background-music' không tìm thấy trong HTML.");
        }

        if(textsContent.length>0) setTimeout(()=>{if(document.querySelectorAll('.falling-text').length<MAX_ACTIVE_TEXTS)createTextElement();setInterval(createTextElement,TEXT_CREATION_INTERVAL);},INITIAL_TEXT_SPAWN_DELAY);
        
        // Chỉ khởi tạo vòng lặp tạo ảnh nếu có ảnh trong imageFilenames
        if(imageFilenames && imageFilenames.length > 0) {
            console.log("[Init] Starting image creation loop. Number of images available:", imageFilenames.length);
            setTimeout(()=>{
                if(document.querySelectorAll('.falling-image').length < MAX_ACTIVE_IMAGES) createImageElement();
                setInterval(createImageElement, IMAGE_CREATION_INTERVAL);
            }, INITIAL_IMAGE_SPAWN_DELAY);
        } else {
            console.warn("[Init] No images available (imageFilenames is empty or null). Image creation will not start.");
        }

        if(iconsConfig && iconsConfig.length > 0) setTimeout(() => { if (document.querySelectorAll('.falling-icon-container').length < MAX_ACTIVE_ICONS) createIconElement(); setInterval(createIconElement, ICON_CREATION_INTERVAL); }, INITIAL_ICON_SPAWN_DELAY);
        if(MAX_DYNAMIC_STARS > 0) setTimeout(()=>{for(let i=0; i<Math.min(MAX_DYNAMIC_STARS,20);i++){if(document.querySelectorAll('.dynamic-star').length<MAX_DYNAMIC_STARS)createDynamicStar();} setInterval(createDynamicStar,DYNAMIC_STAR_CREATION_INTERVAL);}, INITIAL_DYNAMIC_STAR_SPAWN_DELAY);
        
        requestAnimationFrame(animationLoop);
        sceneContainer.style.cursor='grab';
        updateTextAreaTransform();
    }

    function createTextElement(){
        if(!textsContent || textsContent.length===0 || document.querySelectorAll('.falling-text').length>=MAX_ACTIVE_TEXTS)return;
        const tC=textsContent[Math.floor(Math.random()*textsContent.length)];
        const tE=document.createElement('div');tE.classList.add('falling-text');tE.textContent=tC;
        const rLZ=(Math.random()-0.5)*ELEMENT_Z_DEPTH_RANGE;
        tE.dataset.localZ=rLZ;
        tE.style.transform=`translateZ(${rLZ}px) translateX(0px) translateY(0px)`;
        tE.dataset.currentTranslateX=0;tE.dataset.currentTranslateY=0;
        const tBFS=window.innerWidth>768?TARGET_APPARENT_FONT_SIZE_DESKTOP:TARGET_APPARENT_FONT_SIZE_MOBILE;
        const sS=Math.max(0.01,currentSceneScale);let cFS=tBFS/sS;
        cFS=Math.max(MIN_EFFECTIVE_FONT_SIZE,Math.min(MAX_EFFECTIVE_FONT_SIZE,cFS));
        tE.style.fontSize=`${cFS}px`;
        const bSRF=Math.random()*500+375;tE.dataset.baseSpeed=bSRF;
        const rIYP=-(Math.random()*400+20);tE.style.top=`${rIYP}%`;
        const rIXP=(Math.random()*1000)-500;tE.style.left=`${rIXP}%`;
        tE.style.opacity="0";
        textArea.appendChild(tE);
        // Transition được xử lý trong animationLoop và CSS ban đầu cho .falling-text nếu có
        // Nên bỏ setTimeout thay đổi transition ở đây nếu opacity được quản lý động
    }

    function createImageElement(){
        if(!imageFilenames || imageFilenames.length===0 || document.querySelectorAll('.falling-image').length>=MAX_ACTIVE_IMAGES) return;
        
        const iP = getNextUniqueImageFilename();
        if (!iP) {
            // console.warn("Could not get an image path/URL to create an image element.");
            return;
        }
        
        const iE=document.createElement('img');
        iE.classList.add('falling-image');
        iE.src = iP; // iP bây giờ là URL từ Google Drive hoặc fallback cục bộ
        iE.alt = "Falling image";
        // Thêm referrerpolicy để có thể tải ảnh từ Google Drive (thường là không cần nếu ảnh được chia sẻ công khai đúng cách)
        // iE.referrerPolicy = "no-referrer-when-downgrade"; // hoặc "no-referrer" nếu cần
        
        const rLZ=(Math.random()-0.5)*ELEMENT_Z_DEPTH_RANGE; iE.dataset.localZ=rLZ;
        iE.style.transform=`translateZ(${rLZ}px) translateX(0px) translateY(0px)`;
        iE.dataset.currentTranslateX=0; iE.dataset.currentTranslateY=0;
        
        const tBIW=window.innerWidth>768?TARGET_APPARENT_IMAGE_WIDTH_DESKTOP:TARGET_APPARENT_IMAGE_WIDTH_MOBILE;
        const sS=Math.max(0.01,currentSceneScale);let cW=tBIW/sS;cW=Math.max(30,Math.min(1200,cW));
        iE.style.width=`${cW}px`; iE.style.height='auto';
        
        let nS=0;if(MAX_SCENE_SCALE-MIN_SCENE_SCALE>0.001){nS=(currentSceneScale-MIN_SCENE_SCALE)/(MAX_SCENE_SCALE-MIN_SCENE_SCALE);nS=Math.max(0,Math.min(1,nS));}else if(currentSceneScale>=MAX_SCENE_SCALE)nS=1;
        const dBW=MIN_ZOOM_IMAGE_BORDER_WIDTH+nS*(MAX_ZOOM_IMAGE_BORDER_WIDTH-MIN_ZOOM_IMAGE_BORDER_WIDTH);
        const dBR=MIN_ZOOM_IMAGE_BORDER_RADIUS+nS*(MAX_ZOOM_IMAGE_BORDER_RADIUS-MIN_ZOOM_IMAGE_BORDER_RADIUS);
        iE.style.borderWidth=`${Math.round(dBW)}px`; iE.style.borderRadius=`${Math.round(dBR)}px`;
        iE.style.borderColor="#BCE1ED"; iE.style.borderStyle="solid";
        
        const iBSF=(Math.random()*200+200);iE.dataset.baseSpeed=iBSF;
        const rIYP=-(Math.random()*400+20);iE.style.top=`${rIYP}%`;
        const rIXP=(Math.random()*800)-400;iE.style.left=`${rIXP}%`;
        
        iE.style.opacity="0"; // CSS đặt opacity ban đầu là 0, JS sẽ làm nó hiện ra trong animationLoop
        
        iE.onload = () => {
            textArea.appendChild(iE);
            // Opacity và transition sẽ được xử lý bởi animationLoop và CSS.
            // Không cần setTimeout ở đây để thay đổi opacity hoặc transition nữa
            // nếu bạn muốn opacity được tính toán động dựa trên Z-depth.
        };
        iE.onerror = () => {
            console.warn(`Failed to load image: ${iP}. Check sharing permissions if it's a Drive link, or path if local.`);
            if(iE.parentNode) iE.parentNode.removeChild(iE);
            // Có thể thử tải ảnh tiếp theo hoặc xử lý lỗi khác ở đây
        };
    }

    function createIconElement(){
        if(!iconsConfig || iconsConfig.length===0 || document.querySelectorAll('.falling-icon-container').length>=MAX_ACTIVE_ICONS)return;
        const c=iconsConfig[Math.floor(Math.random()*iconsConfig.length)];
        const iC=document.createElement('div');iC.classList.add('falling-icon-container');
        const iEl=document.createElement('i');c.iconClass.split(' ').forEach(cl=>iEl.classList.add(cl));iEl.style.color=c.color;
        const tEl=document.createElement('span');tEl.textContent=c.text;tEl.style.color=c.color;
        iC.appendChild(iEl);iC.appendChild(tEl);
        const tBOS=c.size;const sS=Math.max(0.01,currentSceneScale);let cOFS=tBOS/sS;cOFS=Math.max(10,Math.min(80,cOFS));
        iC.style.fontSize=`${cOFS}px`;
        iC.style.transform=`translateZ(0px) translateX(0px) translateY(0px)`;
        iC.dataset.currentTranslateX=0;iC.dataset.currentTranslateY=0;
        const iBSF=(Math.random()*150+150);iC.dataset.baseSpeed=iBSF;
        const rIYP=-(Math.random()*350+20);iC.style.top=`${rIYP}%`;
        const rIXP=(Math.random()*700)-350;iC.style.left=`${rIXP}%`;
        // iC.style.transition='opacity 0.5s ease-in-out'; // CSS đặt opacity ban đầu, JS xử lý trong loop
        textArea.appendChild(iC);
        // setTimeout(()=>{iC.style.opacity=1;setTimeout(()=>{if(iC.style && iC.style.transition.includes('opacity')) iC.style.transition='';},FADE_DURATION);},50);
    }
    
    // ... (createDynamicStar, animationLoop, updateTextAreaTransform, và các event listeners giữ nguyên) ...
    // QUAN TRỌNG: Trong animationLoop, logic tính toán và đặt `el.style.opacity` cho '.falling-image' và '.falling-text'
    // sẽ đảm nhiệm việc làm chúng hiện ra.
    // Bất kỳ `transition: opacity` nào trên CSS cho các class này cần được xem xét cẩn thận.
    // Nếu CSS đặt `opacity: 0` và `transition: opacity 0.5s`, thì khi JS thay đổi opacity trong animationLoop,
    // nó có thể bị ảnh hưởng bởi transition đó.

    // ... (Phần còn lại của script.js giữ nguyên từ gốc của bạn)
    // (bao gồm cả lastFrameTime, animationLoop, animateFallingElement, updateTextAreaTransform,
    // các event listeners cho chuột và chạm)
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
                            elementSpeed = Math.max(baseSpeed * 0.1, elementSpeed); // Ngăn tốc độ quá chậm hoặc âm
                            // Opacity dựa trên Z: xa hơn thì mờ hơn (nếu normZ âm là xa)
                            // Gần hơn (normZ dương) không làm tăng opacity quá 1
                            opacityFromZ = 1 - (Math.max(0, -normZ) * Z_OPACITY_EFFECT_STRENGTH); 
                            opacityFromZ = Math.max(0.1, opacityFromZ); // Giới hạn opacity tối thiểu
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
                    opacityFromZ = parseFloat(el.style.opacity || 1); // Icon không có Z-depth opacity riêng, giữ opacity từ transition fade-in
                                                                     // Hoặc set 1 nếu transition đã xong
                    if (el.style.transition.includes('opacity')) {
                        const currentCssOpacity = parseFloat(window.getComputedStyle(el).opacity);
                        if (currentCssOpacity >= 0.98) { // Nếu fade-in gần xong
                           el.style.transition = ''; // Xóa transition để loop kiểm soát
                           opacityFromZ = 1; // Đặt opacity là 1
                        } else {
                            opacityFromZ = currentCssOpacity; // Giữ opacity từ transition
                        }
                    }


                } else if (elementType === 'star') { 
                    // ... (logic sao giữ nguyên) ...
                }
                
                currentTX += finalSpeedX * deltaTime;
                currentTY += finalSpeedY * deltaTime;
                el.dataset.currentTranslateX = currentTX;
                el.dataset.currentTranslateY = currentTY;
                el.style.transform = `translateZ(${localZ}px) translateX(${currentTX}px) translateY(${currentTY}px)`;
                
                const rect = el.getBoundingClientRect();
                // Điều kiện kiểm tra render ban đầu
                if (rect.width === 0 && rect.height === 0 && el.dataset.initialRenderAttempted !== "true") {
                    el.dataset.initialRenderAttempted = "true";
                    // Kiểm tra vị trí ước tính, nếu quá xa viewport thì xóa (đặc biệt quan trọng cho phần tử có left/top là %)
                    const estTopPercent = parseFloat(el.style.top); // Lấy % từ style.top
                    if (!isNaN(estTopPercent)) {
                        const estimatedTopPx = (estTopPercent / 100 * textArea.offsetHeight) + currentTY;
                        if (estimatedTopPx < -viewportH * 3 || estimatedTopPx > viewportH * 4) {
                            if (el.parentNode) el.remove();
                            return;
                        }
                    }
                } else if (rect.width > 0 || rect.height > 0) { 
                    // Logic tính opacity từ cạnh màn hình
                    let opacityFromEdges = 1.0; 
                    if (EDGE_FADE_ZONE_RATIO_Y > 0 && rect.bottom > viewportH - edgeFadeZoneY_Bottom) {
                        const progressBottom = Math.min(1,(rect.bottom-(viewportH-edgeFadeZoneY_Bottom))/edgeFadeZoneY_Bottom);
                        opacityFromEdges = Math.min(opacityFromEdges, 1 - progressBottom);
                    }
                    opacityFromEdges = Math.max(0, opacityFromEdges); // Đảm bảo opacity không âm
                    
                    // Áp dụng opacity cuối cùng
                    if (elementType !== 'star') { // Sao có logic opacity riêng
                        // Cho text và image, opacity cuối cùng là min của opacity từ Z-depth và opacity từ cạnh màn hình
                        el.style.opacity = Math.min(opacityFromEdges, opacityFromZ).toFixed(2);
                    } else { 
                         el.style.opacity = opacityFromZ.toFixed(2); // Sao dùng opacity riêng từ logic nhấp nháy/tuổi thọ
                    }

                    // Điều kiện xóa phần tử
                    const removeThreshold = elOriginalSize * (elementType === 'star' ? 1.2 : 1.8); 
                    if (parseFloat(el.style.opacity) <= 0.01 ||
                        rect.bottom < -removeThreshold || rect.top > viewportH + removeThreshold ||
                        rect.right < -removeThreshold || rect.left > viewportW + removeThreshold) {
                        if (el.parentNode) el.remove();
                    }
                }
            });
        }

        animateFallingElement('.falling-text', 'text');
        animateFallingElement('.falling-image', 'image');
        animateFallingElement('.falling-icon-container', 'icon');
        animateFallingElement('.dynamic-star', 'star'); 

        requestAnimationFrame(animationLoop); 
    }

    function updateTextAreaTransform() { 
        const translateZValue = FIXED_SCENE_Z_DEPTH; 
        currentSceneScale = Math.max(MIN_SCENE_SCALE, Math.min(MAX_SCENE_SCALE, currentSceneScale)); 
        currentRotationX = Math.max(-maxAngle, Math.min(maxAngle, currentRotationX)); 
        currentRotationY = Math.max(-maxAngle, Math.min(35, currentRotationY)); 
        textArea.style.transform = `translateZ(${translateZValue}px) scale(${currentSceneScale}) rotateX(${currentRotationX}deg) rotateY(${currentRotationY}deg)`; 
    }

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