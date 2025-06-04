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
    let textsContent = [];

    // --- CÁC THAM SỐ CẤU HÌNH ---
    const FADE_DURATION = 500;
    // TEXT
    const TEXT_CREATION_INTERVAL = 50;
    const INITIAL_TEXT_SPAWN_DELAY = 500;
    // IMAGE
    const MAX_ACTIVE_IMAGES = 10;
    const IMAGE_CREATION_INTERVAL = 1500;
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
    // ICON
    let iconsConfig = [];
    const MAX_ACTIVE_ICONS = 7;
    const ICON_CREATION_INTERVAL = 2000;
    const INITIAL_ICON_SPAWN_DELAY = 2500;
    // SCENE
    const PERSPECTIVE_VALUE_FROM_CSS = 1000; // Giữ lại giá trị này để tham chiếu, nhưng không dùng trực tiếp nếu muốn thay đổi dễ
    const FIXED_SCENE_Z_DEPTH = -800; // <<<< THAY ĐỔI Ở ĐÂY (Đẩy scene ra xa hơn)
                                      // Giá trị này nên có độ lớn bằng hoặc lớn hơn PERSPECTIVE_VALUE_FROM_CSS một chút
    // SPEED
    const MIN_VIEW_SPEED_MULTIPLIER = 1.0;
    const MAX_VIEW_SPEED_MULTIPLIER = 1.0;
    // ROTATION & SCALE
    let currentRotationX = 5; 
    let currentRotationY = 15; 
    const rotationSensitivityMouse = 0.03;
    const rotationSensitivityTouch = 0.15;
    const maxAngle = 75;
    const MIN_SCENE_SCALE = 0.3;
    let currentSceneScale = MIN_SCENE_SCALE; 
    const MAX_SCENE_SCALE = 2.0;
    const ZOOM_SENSITIVITY_MOUSE_WHEEL = 0.03;
    const ZOOM_SENSITIVITY_PINCH = 0.03;
    // FONT
    const TARGET_APPARENT_FONT_SIZE_DESKTOP = 30;
    const TARGET_APPARENT_FONT_SIZE_MOBILE = 22;
    const MIN_EFFECTIVE_FONT_SIZE = 1;
    const MAX_EFFECTIVE_FONT_SIZE = 100;
    // EDGE FADE
    const EDGE_FADE_ZONE_RATIO_X = 0;
    const EDGE_FADE_ZONE_RATIO_Y = 0.20;
    let edgeFadeZoneX, edgeFadeZoneY_Bottom;

    let isMouseDown = false;
    let lastMouseX = 0, lastMouseY = 0;
    let isTouching = false;
    let lastTouchX = 0, lastTouchY = 0;
    let isPinching = false;
    let initialPinchDistance = 0;

    function getNextUniqueImageFilename() {
        if (imageFilenames.length === 0) return null;
        if (availableImageIndicesToSpawn.length === 0 || currentSpawnIndex >= availableImageIndicesToSpawn.length) {
            availableImageIndicesToSpawn = Array.from(Array(imageFilenames.length).keys());
            shuffleArray(availableImageIndicesToSpawn);
            currentSpawnIndex = 0;
        }
        if (availableImageIndicesToSpawn.length === 0) return null;
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
            .then(response => {
                if (!response.ok) throw new Error('Không thể tải file icons.ini');
                return response.text();
            })
            .then(data => {
                const lines = data.split('\n');
                iconsConfig = lines
                    .map(line => line.trim())
                    .filter(line => line.length > 0 && !line.startsWith(';'))
                    .map(line => {
                        const parts = line.split('|').map(part => part.trim());
                        if (parts.length === 4) {
                            return {
                                iconClass: parts[0],
                                text: parts[1],
                                color: parts[2],
                                size: parseInt(parts[3], 10) || 20
                            };
                        }
                        return null;
                    })
                    .filter(config => config !== null);
                if (iconsConfig.length === 0) {
                    console.warn("File icons.ini trống hoặc không đúng định dạng.");
                }
            })
            .catch(error => {
                console.error('Lỗi khi tải icons.ini:', error);
            });
    }

    Promise.all([
        fetch('textindex.ini')
            .then(response => {
                if (!response.ok) throw new Error('Không thể tải file textindex.ini');
                return response.text();
            })
            .then(data => {
                textsContent = data.split('\n').map(line => line.trim()).filter(line => line.length > 0);
                if (textsContent.length === 0) {
                    console.warn("File textindex.ini trống. Sử dụng text mặc định.");
                    textsContent = ["Hiệu ứng Chữ Rơi", "Kết hợp Ảnh & Icon", "Cấu hình từ File .ini"];
                }
            })
            .catch(error => {
                console.error('Lỗi khi tải textindex.ini:', error);
                textsContent = ["Lỗi tải nội dung text!", "Vui lòng kiểm tra file textindex.ini."];
            }),
        fetchIconsConfig()
    ]).then(() => {
        initScene();
    }).catch(error => {
        console.error("Lỗi khởi tạo chung:", error);
        initScene(); 
    });

    function initScene() {
        calculateEdgeFadeZones();
        window.addEventListener('resize', calculateEdgeFadeZones);

        if (textsContent.length > 0) {
            setTimeout(() => {
                createTextElement();
                setInterval(createTextElement, TEXT_CREATION_INTERVAL);
            }, INITIAL_TEXT_SPAWN_DELAY);
        }

        if (imageFilenames.length > 0) {
            setTimeout(() => {
                createImageElement();
                setInterval(createImageElement, IMAGE_CREATION_INTERVAL);
            }, INITIAL_IMAGE_SPAWN_DELAY);
        } else {
            console.log("Không có file ảnh cục bộ nào được liệt kê.");
        }

        if (iconsConfig.length > 0) {
            setTimeout(() => {
                createIconElement();
                setInterval(createIconElement, ICON_CREATION_INTERVAL);
            }, INITIAL_ICON_SPAWN_DELAY);
        } else {
            console.log("Không có cấu hình icon nào được tải. Icon sẽ không được tạo.");
        }

        requestAnimationFrame(animationLoop);
        sceneContainer.style.cursor = 'grab';
        updateTextAreaTransform();
    }

    function createTextElement() {
        if (textsContent.length === 0) return;
        const textContent = textsContent[Math.floor(Math.random() * textsContent.length)];
        const textElement = document.createElement('div');
        textElement.classList.add('falling-text');
        textElement.textContent = textContent;
        textElement.style.transform = `translateZ(0px) translateX(0px) translateY(0px)`;
        textElement.dataset.currentTranslateX = 0;
        textElement.dataset.currentTranslateY = 0;
        const targetBaseFontSize = window.innerWidth > 768 ? TARGET_APPARENT_FONT_SIZE_DESKTOP : TARGET_APPARENT_FONT_SIZE_MOBILE;
        const safeScale = Math.max(0.01, currentSceneScale);
        let calculatedFontSize = targetBaseFontSize / safeScale;
        calculatedFontSize = Math.max(MIN_EFFECTIVE_FONT_SIZE, Math.min(MAX_EFFECTIVE_FONT_SIZE, calculatedFontSize));
        textElement.style.fontSize = `${calculatedFontSize}px`;
        const baseSpeedRandomFactor = Math.random() * 500 + 375;
        textElement.dataset.baseSpeed = baseSpeedRandomFactor;
        const randomInitialYPercent = -(Math.random() * 400 + 20);
        textElement.style.top = `${randomInitialYPercent}%`;
        const randomInitialXPercent = (Math.random() * 1000) - 500;
        textElement.style.left = `${randomInitialXPercent}%`;
        textElement.style.transition = 'opacity 0.5s ease-in-out';
        textArea.appendChild(textElement);
        setTimeout(() => {
            textElement.style.opacity = 1;
            setTimeout(() => { textElement.style.transition = ''; }, FADE_DURATION);
        }, 50);
    }

    function createImageElement() {
        if (imageFilenames.length === 0 || document.querySelectorAll('.falling-image').length >= MAX_ACTIVE_IMAGES) {
            return;
        }
        const imagePath = getNextUniqueImageFilename();
        if (!imagePath) return;
        const imageElement = document.createElement('img');
        imageElement.classList.add('falling-image');
        imageElement.src = imagePath;
        imageElement.alt = "Falling image snippet";
        imageElement.style.transform = `translateZ(0px) translateX(0px) translateY(0px)`;
        imageElement.dataset.currentTranslateX = 0;
        imageElement.dataset.currentTranslateY = 0;
        const targetBaseImageWidth = window.innerWidth > 768 ? TARGET_APPARENT_IMAGE_WIDTH_DESKTOP : TARGET_APPARENT_IMAGE_WIDTH_MOBILE;
        const safeScale = Math.max(0.01, currentSceneScale);
        let calculatedWidth = targetBaseImageWidth / safeScale;
        calculatedWidth = Math.max(30, Math.min(1200, calculatedWidth));
        imageElement.style.width = `${calculatedWidth}px`;
        imageElement.style.height = 'auto';
        const imageBaseSpeedFactor = (Math.random() * 200 + 200); 
        imageElement.dataset.baseSpeed = imageBaseSpeedFactor;
        const randomInitialYPercent = -(Math.random() * 400 + 20);
        imageElement.style.top = `${randomInitialYPercent}%`;
        const randomInitialXPercent = (Math.random() * 800) - 400;
        imageElement.style.left = `${randomInitialXPercent}%`;
        imageElement.style.transition = 'opacity 0.5s ease-in-out';
        imageElement.onload = () => {
            textArea.appendChild(imageElement);
            setTimeout(() => {
                imageElement.style.opacity = 1;
                setTimeout(() => { imageElement.style.transition = ''; }, FADE_DURATION);
            }, 50);
        };
        imageElement.onerror = () => {
            console.warn(`Không tải được ảnh cục bộ: ${imagePath}.`);
            if (imageElement.parentNode) {
                imageElement.parentNode.removeChild(imageElement);
            }
        };
    }

    function createIconElement() {
        if (iconsConfig.length === 0 || document.querySelectorAll('.falling-icon-container').length >= MAX_ACTIVE_ICONS) {
            return;
        }
        const config = iconsConfig[Math.floor(Math.random() * iconsConfig.length)];
        const iconContainer = document.createElement('div');
        iconContainer.classList.add('falling-icon-container');
        const iconEl = document.createElement('i');
        config.iconClass.split(' ').forEach(cls => iconEl.classList.add(cls));
        iconEl.style.color = config.color;
        const textEl = document.createElement('span');
        textEl.textContent = config.text;
        textEl.style.color = config.color;
        iconContainer.appendChild(iconEl);
        iconContainer.appendChild(textEl);
        const targetBaseOverallSize = config.size;
        const safeScale = Math.max(0.01, currentSceneScale);
        let calculatedOverallFontSize = targetBaseOverallSize / safeScale;
        calculatedOverallFontSize = Math.max(10, Math.min(80, calculatedOverallFontSize));
        iconContainer.style.fontSize = `${calculatedOverallFontSize}px`;
        iconContainer.style.transform = `translateZ(0px) translateX(0px) translateY(0px)`;
        iconContainer.dataset.currentTranslateX = 0;
        iconContainer.dataset.currentTranslateY = 0;
        const iconBaseSpeedFactor = (Math.random() * 150 + 150);
        iconContainer.dataset.baseSpeed = iconBaseSpeedFactor;
        const randomInitialYPercent = -(Math.random() * 350 + 20);
        iconContainer.style.top = `${randomInitialYPercent}%`;
        const randomInitialXPercent = (Math.random() * 700) - 350;
        iconContainer.style.left = `${randomInitialXPercent}%`;
        iconContainer.style.transition = 'opacity 0.5s ease-in-out';
        textArea.appendChild(iconContainer);
        setTimeout(() => {
            iconContainer.style.opacity = 1;
            setTimeout(() => { iconContainer.style.transition = ''; }, FADE_DURATION);
        }, 50);
    }

    let lastFrameTime = 0;
    function animationLoop(currentTime) {
        if (!lastFrameTime) {
            lastFrameTime = currentTime;
            requestAnimationFrame(animationLoop);
            return;
        }
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
                const baseSpeed = parseFloat(el.dataset.baseSpeed);
                let currentTX = parseFloat(el.dataset.currentTranslateX || 0);
                let currentTY = parseFloat(el.dataset.currentTranslateY || 0);
                let elOriginalSize;
                if (elementType === 'text' || elementType === 'icon') {
                    elOriginalSize = el.offsetHeight || (parseFloat(el.style.fontSize) || 20);
                } else if (elementType === 'image') {
                    elOriginalSize = el.offsetHeight || (parseFloat(el.style.width) * 0.75 || 50); 
                } else {
                    elOriginalSize = 20;
                }
                const finalSpeed = baseSpeed;
                const displacement = finalSpeed * deltaTime;
                currentTX += screenDownLocalX * displacement;
                currentTY += screenDownLocalY * displacement;
                el.dataset.currentTranslateX = currentTX;
                el.dataset.currentTranslateY = currentTY;
                el.style.transform = `translateZ(0px) translateX(${currentTX}px) translateY(${currentTY}px)`;
                const rect = el.getBoundingClientRect();
                const elW = rect.width;
                const elH = rect.height;
                if (elW === 0 && elH === 0 && el.dataset.initialRenderAttempted !== "true") {
                    el.dataset.initialRenderAttempted = "true";
                    const estVisualTopPercent = parseFloat(el.style.top);
                    const estVisualTopPx = (estVisualTopPercent / 100 * textArea.offsetHeight) + currentTY;
                    if (estVisualTopPx < -viewportH * 3 || estVisualTopPx > viewportH * 4) {
                        if (el.parentNode) textArea.removeChild(el);
                        return;
                    }
                } else if (elW > 0 || elH > 0) {
                    let opacityFromEdges = 1.0;
                    if (rect.bottom > viewportH - edgeFadeZoneY_Bottom && edgeFadeZoneY_Bottom > 0) {
                        const progressBottom = Math.min(1, (rect.bottom - (viewportH - edgeFadeZoneY_Bottom)) / edgeFadeZoneY_Bottom);
                        opacityFromEdges = Math.min(opacityFromEdges, 1 - progressBottom);
                    }
                    opacityFromEdges = Math.max(0, opacityFromEdges);
                    el.style.opacity = opacityFromEdges;
                    const removeThreshold = elOriginalSize * 2;
                    if (opacityFromEdges <= 0.01 ||
                        rect.bottom < -removeThreshold || rect.top > viewportH + removeThreshold ||
                        rect.right < -removeThreshold || rect.left > viewportW + removeThreshold) {
                        if (el.parentNode) textArea.removeChild(el);
                    }
                }
            });
        }
        animateFallingElement('.falling-text', 'text');
        animateFallingElement('.falling-image', 'image');
        animateFallingElement('.falling-icon-container', 'icon');
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
    document.addEventListener('mousemove', (e) => { if (!isMouseDown) return; const deltaX = e.clientX - lastMouseX; const deltaY = e.clientY - lastMouseY; currentRotationY += deltaX * rotationSensitivityMouse; currentRotationX -= deltaY * rotationSensitivityMouse; updateTextAreaTransform(); lastMouseX = e.clientX; lastMouseY = e.clientY; });
    document.addEventListener('mouseup', () => { if (isMouseDown) { isMouseDown = false; sceneContainer.style.cursor = 'grab'; } });
    document.addEventListener('mouseleave', () => { if (isMouseDown) { isMouseDown = false; sceneContainer.style.cursor = 'default'; } });
    sceneContainer.addEventListener('mouseenter', () => { if (!isMouseDown && !isTouching && !isPinching) { sceneContainer.style.cursor = 'grab'; } });
    sceneContainer.addEventListener('wheel', (e) => { e.preventDefault(); const delta = Math.sign(e.deltaY); currentSceneScale -= delta * ZOOM_SENSITIVITY_MOUSE_WHEEL; updateTextAreaTransform(); }, { passive: false });
    sceneContainer.addEventListener('touchstart', (e) => { isMouseDown = false; sceneContainer.style.cursor = 'grabbing'; if (e.touches.length === 1) { isTouching = true; isPinching = false; lastTouchX = e.touches[0].clientX; lastTouchY = e.touches[0].clientY; } else if (e.touches.length === 2) { isTouching = false; isPinching = true; initialPinchDistance = getDistanceBetweenTouches(e.touches); } }, { passive: false });
    sceneContainer.addEventListener('touchmove', (e) => { if (isTouching && e.touches.length === 1) { if (e.cancelable) e.preventDefault(); const touchX = e.touches[0].clientX; const touchY = e.touches[0].clientY; const deltaX = touchX - lastTouchX; const deltaY = touchY - lastTouchY; currentRotationY += deltaX * rotationSensitivityTouch; currentRotationX -= deltaY * rotationSensitivityTouch; updateTextAreaTransform(); lastTouchX = touchX; lastTouchY = touchY; } else if (isPinching && e.touches.length === 2) { if (e.cancelable) e.preventDefault(); const currentPinchDistance = getDistanceBetweenTouches(e.touches); const deltaDistance = currentPinchDistance - initialPinchDistance; currentSceneScale += deltaDistance * ZOOM_SENSITIVITY_PINCH; updateTextAreaTransform(); initialPinchDistance = currentPinchDistance; } }, { passive: false });
    sceneContainer.addEventListener('touchend', (e) => { if (isMouseDown) { sceneContainer.style.cursor = 'grabbing';} else if (e.touches.length > 0 && (isTouching || isPinching)) { sceneContainer.style.cursor = 'grabbing';} else { sceneContainer.style.cursor = 'grab';} if (isTouching && e.touches.length === 0) { isTouching = false; } if (isPinching && e.touches.length < 2) { isPinching = false; } if (!isPinching && e.touches.length === 1) { isTouching = true; lastTouchX = e.touches[0].clientX; lastTouchY = e.touches[0].clientY; } });
    sceneContainer.addEventListener('touchcancel', () => { isTouching = false; isPinching = false; isMouseDown = false; sceneContainer.style.cursor = 'grab'; });
    function getDistanceBetweenTouches(touches) { const touch1 = touches[0]; const touch2 = touches[1]; return Math.sqrt( Math.pow(touch2.clientX - touch1.clientX, 2) + Math.pow(touch2.clientY - touch1.clientY, 2) ); }
});