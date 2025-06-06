// Hàm tiện ích để xáo trộn thứ tự các phần tử trong một mảng (Fisher-Yates shuffle)
function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]]; // Hoán đổi phần tử
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const sceneContainer = document.getElementById('scene-container');
    const textArea = document.getElementById('text-area');
    const backgroundMusic = document.getElementById('background-music');

    let textsContent = [];
    const FADE_DURATION = 500; // ms
    const ELEMENT_Z_DEPTH_RANGE = 2000;
    const Z_SPEED_EFFECT_STRENGTH = 0.3;
    const Z_OPACITY_EFFECT_STRENGTH = 0.4;

    const MAX_ACTIVE_TEXTS = 70;
    const TEXT_CREATION_INTERVAL = 200;
    const INITIAL_TEXT_SPAWN_DELAY = 500;

    const MAX_ACTIVE_IMAGES = 8; // Số lượng ảnh tối đa hiển thị cùng lúc
    const IMAGE_CREATION_INTERVAL = 1500; // ms, tần suất thử tạo ảnh mới
    const INITIAL_IMAGE_SPAWN_DELAY = 1500;

    let imageFilenames = []; // Sẽ được điền bởi getImagesFromGitHub
    let failedImageLoadCount = 0;

    const GITHUB_OWNER = 'Hp010503';
    const GITHUB_REPO = 'nguyenthuylinh';
    const GITHUB_IMAGE_PATH = 'assets/images';
    const GITHUB_BRANCH = 'main';

    let imageCreationIntervalId = null;


    const defaultLocalImageFilenames = [
        // 'assets/images/fallback1.jpg',
        // 'assets/images/fallback2.png',
    ];

    async function getImagesFromGitHub() { // Phiên bản gốc, không có isRefresh
        if (!GITHUB_OWNER || !GITHUB_REPO || !GITHUB_IMAGE_PATH ||
            GITHUB_OWNER === 'YOUR_GITHUB_OWNER' ||
            GITHUB_REPO === 'YOUR_GITHUB_REPO' ||
            GITHUB_IMAGE_PATH === 'YOUR_GITHUB_IMAGE_PATH') {
            console.warn("GitHub owner, repo, or image path is missing or still has placeholder values. Falling back to local default images if available.");
            return defaultLocalImageFilenames.length > 0 ? defaultLocalImageFilenames : [];
        }

        const apiUrl = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${GITHUB_IMAGE_PATH}?ref=${GITHUB_BRANCH}×tamp=${new Date().getTime()}`;
        console.log(`[GitHub Initial] Fetching image list from: ${apiUrl.substring(0, apiUrl.indexOf('?'))}`);

        try {
            const res = await fetch(apiUrl);
            if (!res.ok) {
                const errorData = await res.json().catch(() => ({ message: "Unknown API error or response was not JSON." }));
                console.error(`GitHub API error: ${res.status}`, errorData.message || "Could not parse error message.");
                console.warn(`    Troubleshooting GitHub API: Ensure owner, repo, path, and branch are correct, and the repo is public.`);
                return defaultLocalImageFilenames.length > 0 ? defaultLocalImageFilenames : [];
            }
            const data = await res.json();

            if (!Array.isArray(data)) {
                console.error('GitHub API did not return an array for folder contents. Response:', data);
                console.warn(`    Ensure GITHUB_IMAGE_PATH points to a directory, not a file.`);
                return defaultLocalImageFilenames.length > 0 ? defaultLocalImageFilenames : [];
            }

            if (data && data.length > 0) {
                const imageFiles = data.filter(file =>
                    file.type === 'file' && /\.(png|jpe?g|gif|svg|webp)$/i.test(file.name)
                );

                const imgLinks = imageFiles.map(file =>
                    `https://raw.githubusercontent.com/${GITHUB_OWNER}/${GITHUB_REPO}/${GITHUB_BRANCH}/${file.path}`
                );

                console.log(`[GitHub Initial] Image URLs fetched: ${imgLinks.length} potential images found.`);
                if (imgLinks.length === 0) {
                    console.warn(`[GitHub Initial] No image files found in the specified GitHub path. Falling back to local defaults if available.`);
                    return defaultLocalImageFilenames.length > 0 ? defaultLocalImageFilenames : [];
                }
                return imgLinks;
            } else {
                console.warn(`[GitHub Initial] No files found in the GitHub path or path is empty/inaccessible. Falling back to local defaults if available.`);
                return defaultLocalImageFilenames.length > 0 ? defaultLocalImageFilenames : [];
            }
        } catch (error) {
            console.error(`Error during getImagesFromGitHub function:`, error);
            console.warn("Falling back to local default images due to an error if available.");
            return defaultLocalImageFilenames.length > 0 ? defaultLocalImageFilenames : [];
        }
    }

    // QUAN TRỌNG: Logic chọn ảnh được đơn giản hóa và sửa lỗi lặp lại
    let availableImageIndicesToSpawn = [];
    let currentSpawnIndex = 0; // Index trong mảng availableImageIndicesToSpawn

    function getNextUniqueImageFilename() {
        if (!imageFilenames || imageFilenames.length === 0) {
            // console.log("[getNextUniqueImageFilename] No imageFilenames available.");
            return null;
        }

        // Nếu availableImageIndicesToSpawn rỗng (lần đầu) hoặc đã duyệt hết
        if (availableImageIndicesToSpawn.length === 0 || currentSpawnIndex >= availableImageIndicesToSpawn.length) {
            console.log("[getNextUniqueImageFilename] Shuffling image list for a new cycle. Total images:", imageFilenames.length);
            availableImageIndicesToSpawn = Array.from(Array(imageFilenames.length).keys()); // Tạo mảng các index [0, 1, 2, ...]
            shuffleArray(availableImageIndicesToSpawn); // Xáo trộn các index đó
            currentSpawnIndex = 0; // Reset con trỏ về đầu mảng index đã xáo trộn
            // console.log("[getNextUniqueImageFilename] Shuffled indices (first 5):", availableImageIndicesToSpawn.slice(0,5));
        }

        // Lấy index thực sự của ảnh từ mảng index đã xáo trộn
        const actualImageIndex = availableImageIndicesToSpawn[currentSpawnIndex];
        
        // Lấy URL ảnh từ imageFilenames bằng index thực sự đó
        const filename = imageFilenames[actualImageIndex];
        
        // console.log(`[getNextUniqueImageFilename] Selected image at original index ${actualImageIndex}: ${filename ? filename.substring(filename.lastIndexOf('/')+1) : 'null'}. currentSpawnIndex (in shuffled list): ${currentSpawnIndex}`);
        
        currentSpawnIndex++; // Di chuyển con trỏ đến ảnh tiếp theo trong lượt xáo trộn này

        return filename;
    }


    const TARGET_APPARENT_IMAGE_WIDTH_DESKTOP = 250;
    // ... (các hằng số và biến khác giữ nguyên như code gốc của bạn) ...
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
    const TARGET_APPARENT_FONT_SIZE_DESKTOP = 90;
    const TARGET_APPARENT_FONT_SIZE_MOBILE = 55;
    const MIN_EFFECTIVE_FONT_SIZE = 1;
    const MAX_EFFECTIVE_FONT_SIZE = 300;
    const EDGE_FADE_ZONE_RATIO_X = 0;
    const EDGE_FADE_ZONE_RATIO_Y = 0.20;
    let edgeFadeZoneX, edgeFadeZoneY_Bottom;
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
            }).catch(e=>{console.error('icons.ini fetch error:',e); iconsConfig = [];});
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
        }
    }

    Promise.all([
        fetch('textindex.ini')
            .then(r=>{if(!r.ok)throw new Error('textindex.ini load failed');return r.text()})
            .then(d=>{textsContent=d.split('\n').map(l=>l.trim()).filter(l=>l.length>0);if(textsContent.length===0)textsContent=["Default Text Line"];})
            .catch(e=>{console.error('textindex.ini fetch error:',e);textsContent=["Error Loading Texts"];}),
        fetchIconsConfig(),
        fetchStarfieldConfig(),
        getImagesFromGitHub() // Chỉ gọi hàm fetch gốc
    ]).then((results) => {
        imageFilenames = results[3]; // Lấy mảng URL ảnh
        console.log("Initial imageFilenames fetched. Count:", imageFilenames.length);
        if (imageFilenames.length > 0) {
            console.log("Initial sample image URLs:", imageFilenames.slice(0, 5));
            // Không cần khởi tạo availableImageIndicesToSpawn ở đây, getNextUniqueImageFilename sẽ làm
        } else {
            console.warn("No images loaded initially. Image effects will be disabled.");
        }

        // ... (log thông báo thành công/thất bại như cũ)
        if (imageFilenames.length > 0) {
            const isUsingGitHubImages = imageFilenames[0] && imageFilenames[0].includes("raw.githubusercontent.com");
            const isUsingLocalFallback = imageFilenames === defaultLocalImageFilenames && defaultLocalImageFilenames.length > 0;

            if (isUsingGitHubImages) {
                console.log("Successfully using", imageFilenames.length, "image URLs from GitHub.");
            } else if (isUsingLocalFallback) {
                 console.log("Using", imageFilenames.length, "local fallback images.");
            } else if (imageFilenames.length > 0) {
                 console.log("Using", imageFilenames.length, "images (likely local fallbacks as GitHub fetch might have issues or returned empty).");
            }
        } else {
            console.warn("No image URLs obtained from GitHub and no local fallback images are configured or available. No images will be displayed initially.");
        }


        applyStarfieldStyles();
        initScene();

        // Không có logic refresh ảnh tự động trong phiên bản này

    }).catch(e => {
        console.error("Critical error during initial file fetching (Promise.all):", e);
        console.warn("Attempting to initialize scene with any available fallbacks.");
        imageFilenames = defaultLocalImageFilenames.length > 0 ? defaultLocalImageFilenames : [];
        textsContent = textsContent.length > 0 ? textsContent : ["Error Loading Content"];
        iconsConfig = iconsConfig.length > 0 ? iconsConfig : [];
        applyStarfieldStyles();
        initScene();
    });

    function initScene() {
        calculateEdgeFadeZones();
        window.addEventListener('resize', calculateEdgeFadeZones);

        if (backgroundMusic) {
            // ... (logic nhạc nền giữ nguyên)
            const playMusicOnFirstInteraction = () => {
                if (backgroundMusic.paused && backgroundMusic.dataset.playedByInteraction !== 'true') {
                    let playPromise = backgroundMusic.play();
                    if (playPromise !== undefined) {
                        playPromise.then(() => {
                            backgroundMusic.dataset.playedByInteraction = 'true';
                            document.removeEventListener('click', playMusicOnFirstInteraction, {capture: true});
                            document.removeEventListener('touchstart', playMusicOnFirstInteraction, {capture: true});
                            document.removeEventListener('keydown', playMusicOnFirstInteraction, {capture: true});
                        }).catch(error => {
                             if (error.name !== 'NotAllowedError' && error.name !== 'AbortError') {
                                console.warn("[Interaction] Lỗi khi cố gắng phát nhạc:", error);
                             }
                        });
                    }
                }
            };
            document.addEventListener('click', playMusicOnFirstInteraction, { once: true, capture: true });
            document.addEventListener('touchstart', playMusicOnFirstInteraction, { once: true, capture: true });
            document.addEventListener('keydown', playMusicOnFirstInteraction, { once: true, capture: true });
            document.addEventListener("visibilitychange", () => {
                if (document.visibilityState === 'visible') {
                    if (backgroundMusic.dataset.playedByInteraction === 'true' && backgroundMusic.paused) {
                       let resumePromise = backgroundMusic.play();
                       if (resumePromise !== undefined) { resumePromise.catch(() => {}); }
                    }
                } else {
                    if (!backgroundMusic.paused) { backgroundMusic.pause(); }
                }
            });
        }


        if(textsContent.length>0) setTimeout(()=>{if(document.querySelectorAll('.falling-text').length<MAX_ACTIVE_TEXTS)createTextElement();setInterval(createTextElement,TEXT_CREATION_INTERVAL);},INITIAL_TEXT_SPAWN_DELAY);

        // Image creation loop
        if(imageFilenames && imageFilenames.length > 0) {
            console.log("[Init] Starting image creation loop. Images available for display:", imageFilenames.length, "Max active:", MAX_ACTIVE_IMAGES);
            setTimeout(()=>{
                let initialImagesToCreate = Math.min(MAX_ACTIVE_IMAGES, imageFilenames.length);
                 for (let i = 0; i < initialImagesToCreate; i++) {
                    if(document.querySelectorAll('.falling-image').length < MAX_ACTIVE_IMAGES) {
                        createImageElement();
                    } else break;
                 }

                if (imageCreationIntervalId) clearInterval(imageCreationIntervalId);
                imageCreationIntervalId = setInterval(createImageElement, IMAGE_CREATION_INTERVAL);
                console.log(`[Init] Image creation interval SET with ID: ${imageCreationIntervalId}, Interval time: ${IMAGE_CREATION_INTERVAL}ms`);
            }, INITIAL_IMAGE_SPAWN_DELAY);
        } else {
            console.warn("[Init] No images in imageFilenames array after setup. Image creation loop will not start.");
        }

        if(iconsConfig && iconsConfig.length > 0) setTimeout(() => { if (document.querySelectorAll('.falling-icon-container').length < MAX_ACTIVE_ICONS) createIconElement(); setInterval(createIconElement, ICON_CREATION_INTERVAL); }, INITIAL_ICON_SPAWN_DELAY);
        if(MAX_DYNAMIC_STARS > 0) setTimeout(()=>{for(let i=0; i<Math.min(MAX_DYNAMIC_STARS,20);i++){if(document.querySelectorAll('.dynamic-star').length<MAX_DYNAMIC_STARS)createDynamicStar();} setInterval(createDynamicStar,DYNAMIC_STAR_CREATION_INTERVAL);}, INITIAL_DYNAMIC_STAR_SPAWN_DELAY);

        requestAnimationFrame(animationLoop_entryPoint);
        sceneContainer.style.cursor='grab';
        updateTextAreaTransform();
    }

    function createTextElement(){
        // ... (giữ nguyên)
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
    }


    function createImageElement(){
        const activeImagesCount = document.querySelectorAll('.falling-image').length;
        // console.log(`[createImageElement] Called. Active images: ${activeImagesCount}, Max: ${MAX_ACTIVE_IMAGES}`);

        if(!imageFilenames || imageFilenames.length===0) {
            // console.log("[createImageElement] No image filenames available. Cannot create image.");
            return;
        }
        if (activeImagesCount >= MAX_ACTIVE_IMAGES) {
            // console.log("[createImageElement] Max active images reached. Not creating new one.");
            return;
        }

        const iP = getNextUniqueImageFilename();
        if (!iP) {
            // console.warn("[createImageElement] getNextUniqueImageFilename returned null. Cannot create image this time.");
            return;
        }
        // console.log(`[createImageElement] Attempting to create image: ${iP.substring(iP.lastIndexOf('/')+1)}`);

        const iE=document.createElement('img');
        iE.classList.add('falling-image');
        iE.alt = "Falling image content";

        iE.onload = () => {
            if (!iE.parentNode) {
                textArea.appendChild(iE);
                 console.log(`%c[IMAGE LOADED & APPENDED] ${iP.substring(iP.lastIndexOf('/')+1)}`, 'color: green; font-weight: bold;');
            }
        };
        iE.onerror = () => {
            failedImageLoadCount++;
            console.warn(`(${failedImageLoadCount}) FAILED TO LOAD IMAGE (via img.onerror): ${iP}`);
            console.warn(`    TROUBLESHOOTING:`);
            console.warn(`    1. Open URL in INCOGNITO: ${iP}`);
            console.warn(`    2. Check GitHub: public repo, correct path/branch/filename, file exists.`);
            if(iE.parentNode) iE.parentNode.removeChild(iE);
        };

        iE.src = iP;

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

        const rIYP_orig = -(Math.random()*400+20);
        const rIXP_orig = (Math.random()*800)-400;
        const rIYP_debug = -(Math.random()*50 + 5);
        const rIXP_debug = (Math.random()*60) - 30;
        const rIYP = rIYP_debug;
        const rIXP = rIXP_debug;

        iE.style.top=`${rIYP}%`;
        iE.style.left=`${rIXP}%`;

        const initialOpacity_orig = "0";
        const initialOpacity_debug = "0.9";
        iE.style.opacity = initialOpacity_debug;
    }

    function createIconElement(){
        // ... (giữ nguyên)
        if(!iconsConfig || iconsConfig.length===0||document.querySelectorAll('.falling-icon-container').length>=MAX_ACTIVE_ICONS)return;
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
        textArea.appendChild(iC);
    }


    function createDynamicStar(){
        // ... (giữ nguyên)
        const stars=document.querySelectorAll('.dynamic-star');if(stars.length>=MAX_DYNAMIC_STARS){const oS=stars[0];if(oS)oS.remove();}
        const s=document.createElement('div');s.classList.add('dynamic-star');
        const sz=Math.random()*(MAX_DYNAMIC_STAR_SIZE-MIN_DYNAMIC_STAR_SIZE)+MIN_DYNAMIC_STAR_SIZE;
        s.style.width=`${sz}px`;s.style.height=`${sz}px`;
        const rLZ=(Math.random()-0.5)*ELEMENT_Z_DEPTH_RANGE*0.3;
        s.dataset.localZ=rLZ;
        const iXP=Math.random()*100;const iYP=Math.random()*100;
        s.style.left=`${iXP}%`;s.style.top=`${iYP}%`;
        const r=200+Math.floor(Math.random()*56),g=200+Math.floor(Math.random()*56),b=220+Math.floor(Math.random()*36);
        s.style.backgroundColor=`rgb(${r},${g},${b})`;
        s.style.opacity="0";
        s.dataset.currentOpacity=Math.random()*0.4+0.3;
        s.dataset.opacityDirection=(Math.random()<0.5?-1:1)*DYNAMIC_STAR_TWINKLE_SPEED_FACTOR;
        const sX=(Math.random()-0.5)*60,sY=(Math.random()-0.5)*60;
        s.dataset.speedX=sX;s.dataset.speedY=sY;
        s.dataset.currentTranslateX=0;s.dataset.currentTranslateY=0;
        const lifetime=Math.random()*(DYNAMIC_STAR_MAX_LIFETIME-2000)+2000;
        s.dataset.creationTime=performance.now(); s.dataset.lifetime=lifetime;
        textArea.appendChild(s);
    }


    let lastFrameTime_anim = 0;

    function animateFallingElement(selector, elementType, deltaTime, viewportW, viewportH, screenDownLocalX, screenDownLocalY, currentTime_anim) {
        // ... (giữ nguyên logic animation và xóa element)
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
                        const initialStyleOpacity = parseFloat(el.style.opacity);
                        const calculatedOpacityZ = 1 - (Math.max(0, -normZ) * Z_OPACITY_EFFECT_STRENGTH);
                        opacityFromZ = (initialStyleOpacity > 0 && initialStyleOpacity < 1 && el.dataset.initialOpacitySet !== "true") ? initialStyleOpacity : calculatedOpacityZ;
                        if (initialStyleOpacity > 0 && initialStyleOpacity < 1 && el.dataset.initialOpacitySet !== "true") el.dataset.initialOpacitySet = "true";

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
                if (el.style.transition && el.style.transition.includes('opacity')) {
                    const currentCssOpacity = parseFloat(window.getComputedStyle(el).opacity);
                    if (currentCssOpacity >= 0.99) {
                       el.style.transition = '';
                       opacityFromZ = 1;
                    } else {
                       opacityFromZ = currentCssOpacity;
                    }
                } else {
                     opacityFromZ = parseFloat(el.style.opacity || 1);
                }
            } else if (elementType === 'star') {
                finalSpeedX = parseFloat(el.dataset.speedX || 0);
                finalSpeedY = parseFloat(el.dataset.speedY || 0);
                if(el.dataset.localZ) localZ = parseFloat(el.dataset.localZ);
                elOriginalSize = parseFloat(el.style.width || 2);
                let currentOpacityStar = parseFloat(el.dataset.currentOpacity);
                let opacityDirectionStar = parseFloat(el.dataset.opacityDirection);
                const creationTimeStar = parseFloat(el.dataset.creationTime);
                const lifetimeStar = parseFloat(el.dataset.lifetime);
                const ageStar = currentTime_anim - creationTimeStar;
                if (ageStar > lifetimeStar - DYNAMIC_STAR_FADE_OUT_DURATION) {
                    currentOpacityStar -= (DYNAMIC_STAR_TWINKLE_SPEED_FACTOR * 3 * deltaTime);
                } else {
                    currentOpacityStar += opacityDirectionStar * deltaTime;
                    if (currentOpacityStar > 0.9) { currentOpacityStar = 0.9; opacityDirectionStar *= -1; }
                    if (currentOpacityStar < 0.2) { currentOpacityStar = 0.2; opacityDirectionStar *= -1; }
                }
                currentOpacityStar = Math.max(0, Math.min(1, currentOpacityStar));
                el.dataset.currentOpacity = currentOpacityStar;
                el.dataset.opacityDirection = opacityDirectionStar;
                opacityFromZ = currentOpacityStar;
                if (ageStar > lifetimeStar) {
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
                const estVP = parseFloat(el.style.top); const estVPx=(estVP/100*textArea.offsetHeight)+currentTY;
                if(estVPx<-viewportH*3||estVPx>viewportH*4){if(el.parentNode)el.remove();return;}
            } else if (rect.width > 0 || rect.height > 0) {
                let opacityFromEdges = 1.0;
                if (EDGE_FADE_ZONE_RATIO_Y > 0 && rect.bottom > viewportH - edgeFadeZoneY_Bottom) {
                    const progressBottom = Math.min(1,(rect.bottom-(viewportH-edgeFadeZoneY_Bottom))/edgeFadeZoneY_Bottom);
                    opacityFromEdges = Math.min(opacityFromEdges, 1 - progressBottom);
                }
                opacityFromEdges = Math.max(0, opacityFromEdges);

                if (elementType === 'icon' && el.style.transition && el.style.transition.includes('opacity')) {
                    // Icon is in transition, CSS handles its opacity
                } else {
                    const finalCalculatedOpacity = Math.min(opacityFromEdges, opacityFromZ);
                    el.style.opacity = finalCalculatedOpacity.toFixed(2);
                }

                const removeThreshold_orig = elOriginalSize * (elementType === 'star' ? 1.2 : 1.8);
                const removeThreshold_debug = elOriginalSize * (elementType === 'star' ? 2.5 : 3.5);
                const removeThreshold = removeThreshold_debug;

                const currentElementOpacity = parseFloat(el.style.opacity || 0);
                const isOutOfBound = rect.bottom < -removeThreshold || rect.top > viewportH + removeThreshold ||
                                     rect.right < -removeThreshold || rect.left > viewportW + removeThreshold;

                const shouldRemove_orig = (currentElementOpacity <=0.01 || isOutOfBound);
                const shouldRemove_debug = isOutOfBound;
                const shouldRemove = shouldRemove_debug;

                if (shouldRemove) {
                    if (el.parentNode) {
                        // if (elementType === 'image') console.log(`[animateFallingElement] Removing image: ${el.src ? el.src.substring(el.src.lastIndexOf('/')+1) : 'unknown image'}`);
                        el.remove();
                    }
                }
            }
        });
    }


    function animationLoop_entryPoint(currentTime) {
        // ... (giữ nguyên)
        if (!lastFrameTime_anim) { lastFrameTime_anim = currentTime; requestAnimationFrame(animationLoop_entryPoint); return; }
        const deltaTime = (currentTime - lastFrameTime_anim) / 1000;
        lastFrameTime_anim = currentTime;

        const viewportW = window.innerWidth;
        const viewportH = window.innerHeight;
        const rotX_rad = currentRotationX * Math.PI / 180;
        const rotY_rad = currentRotationY * Math.PI / 180;
        const screenDownLocalX = -Math.sin(rotY_rad) * Math.sin(rotX_rad);
        const screenDownLocalY = Math.cos(rotX_rad);

        animateFallingElement('.falling-text', 'text', deltaTime, viewportW, viewportH, screenDownLocalX, screenDownLocalY, currentTime);
        animateFallingElement('.falling-image', 'image', deltaTime, viewportW, viewportH, screenDownLocalX, screenDownLocalY, currentTime);
        animateFallingElement('.falling-icon-container', 'icon', deltaTime, viewportW, viewportH, screenDownLocalX, screenDownLocalY, currentTime);
        animateFallingElement('.dynamic-star', 'star', deltaTime, viewportW, viewportH, screenDownLocalX, screenDownLocalY, currentTime);

        requestAnimationFrame(animationLoop_entryPoint);
    }


    function updateTextAreaTransform() {
        // ... (giữ nguyên)
        const translateZValue = FIXED_SCENE_Z_DEPTH;
        currentSceneScale = Math.max(MIN_SCENE_SCALE, Math.min(MAX_SCENE_SCALE, currentSceneScale));
        currentRotationX = Math.max(-maxAngle, Math.min(maxAngle, currentRotationX));
        currentRotationY = Math.max(-maxAngle, Math.min(35, currentRotationY));
        textArea.style.transform = `translateZ(${translateZValue}px) scale(${currentSceneScale}) rotateX(${currentRotationX}deg) rotateY(${currentRotationY}deg)`;
    }


    // Event listeners
    // ... (giữ nguyên)
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