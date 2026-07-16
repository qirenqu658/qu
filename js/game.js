(function() {
    'use strict';

    // ==================== 资源路径 ====================
    const IMAGE_PATHS = {
        maggot: 'images/xuge-maggot.png',
        pupa: 'images/xuge-pupa.png',
        fly: 'images/xuge-fly.png',
        butterfly: 'images/xuge-butterfly.png',
        endingMaggot: 'images/xuge-maggot-end.png',
        endingFly: 'images/xuge-fly-end.png',
        endingButterfly: 'images/xuge-butterfly-end.png',
        endingFamily: 'images/蛆蛆家族.png',
        endingElope: 'images/私奔.png',
        flower: 'images/mage_send_flower.png'
    };

    const AUDIO_PATHS = {
        bgm: 'audio/bgm.mp3',
        good: 'audio/good.wav',
        bad: 'audio/bad.wav',
        goodEnd: 'audio/good-end.wav',
        badEnd: 'audio/bad-end.wav',
        maifu: 'audio/maifu.wav',
        hiddenEnd: 'audio/hidden-end.wav'
    };

    // ==================== 安卓适配 ====================
    // 防止页面下拉刷新
    document.addEventListener('touchmove', function(e) {
        var el = e.target;
        var scrollable = el.closest('.announcement-box, .modal-content');
        if (!scrollable) {
            e.preventDefault();
        }
    }, { passive: false });

    // 全屏切换
    function toggleFullscreen() {
        var doc = document.documentElement;
        if (!document.fullscreenElement && !document.webkitFullscreenElement) {
            if (doc.requestFullscreen) {
                doc.requestFullscreen();
            } else if (doc.webkitRequestFullscreen) {
                doc.webkitRequestFullscreen();
            }
        } else {
            if (document.exitFullscreen) {
                document.exitFullscreen();
            } else if (document.webkitExitFullscreen) {
                document.webkitExitFullscreen();
            }
        }
    }

    // 初始化音频上下文（在首次用户交互时调用，适配安卓）
    function initAudio() {
        // 尝试播放静音来激活音频上下文
        var silentBgm = new Audio(AUDIO_PATHS.bgm);
        silentBgm.volume = 0.01;
        silentBgm.loop = true;
        silentBgm.play().then(function() {
            silentBgm.pause();
            silentBgm = null;
        }).catch(function() {});
    }
    const CW = 600;
    const CH = 600;
    const GAME_DURATION = 30;
    const INITIAL_SCORE = 15;

    const PLAYER_WIDTH = 80;
    const PLAYER_HEIGHT = 80;
    const PLAYER_COLLIDE_W = 70;
    const PLAYER_COLLIDE_H = 70;
    const PLAYER_FIXED_Y = CH - 110;

    const DROP_WIDTH = 80;
    const DROP_HEIGHT = 42;
    const DROP_SPEED = 1.5;
    const DROP_SPAWN_RATE = 0.025;
    const MAIFU_SPAWN_DELAY = 5;
    const MAIFU_CHANCE = 0.1;

    const DROP_TYPES = [
        { text: '赛训', color: '#2ecc71', score: 5 },
        { text: '练习', color: '#3498db', score: 3 },
        { text: '摸鱼', color: '#f39c12', score: -5 },
        { text: '摆烂', color: '#e74c3c', score: -10 },
        { text: '麦麸', color: '#ff69b4', score: -1, isMaifu: true }
    ];

    const MORPH_THRESHOLDS = {
        maggot: { min: -Infinity, max: 10 },
        pupa: { min: 11, max: 20 },
        fly: { min: 21, max: 35 },
        butterfly: { min: 36, max: Infinity }
    };

    const MORPH_ICONS = {
        maggot: '🐛',
        pupa: '🪴',
        fly: '🪰',
        butterfly: '🦋'
    };

    const MORPH_NAMES = {
        maggot: '许哥是蛆',
        pupa: '许哥是蛹',
        fly: '许哥变苍蝇',
        butterfly: '许哥化蛆成蝶'
    };

    const MAIFU_THRESHOLD = 5;

    // ==================== 音频 ====================
    const bgmAudio = new Audio(AUDIO_PATHS.bgm);
    bgmAudio.loop = true;
    const goodSound = new Audio(AUDIO_PATHS.good);
    const badSound = new Audio(AUDIO_PATHS.bad);
    const goodEndSound = new Audio(AUDIO_PATHS.goodEnd);
    const badEndSound = new Audio(AUDIO_PATHS.badEnd);
    const maifuSound = new Audio(AUDIO_PATHS.maifu);
    const hiddenEndSound = new Audio(AUDIO_PATHS.hiddenEnd);

    function playSound(audio) {
        audio.pause();
        audio.currentTime = 0;
        audio.play().catch(function(e) { /* 音频自动播放受限 */ });
    }

    function stopAllSounds() {
        [bgmAudio, goodSound, badSound, goodEndSound, badEndSound, maifuSound, hiddenEndSound].forEach(function(audio) {
            audio.pause();
            audio.currentTime = 0;
        });
    }

    // ==================== DOM 引用 ====================
    var canvas = document.getElementById('gameCanvas');
    var ctx = canvas.getContext('2d');
    var wrapper = document.getElementById('canvasWrapper');
    var timerSpan = document.getElementById('timer');
    var scoreSpan = document.getElementById('score');
    var maifuSpan = document.getElementById('maifu');
    var maifuBox = document.getElementById('maifuBox');
    var morphIconSpan = document.getElementById('morph-icon');
    var morphNameSpan = document.getElementById('morph-name');
    var restartBtn = document.getElementById('restartBtn');
    var fullscreenBtn = document.getElementById('fullscreenBtn');

    var startModal = document.getElementById('startModal');
    var endModal = document.getElementById('endModal');
    var flowerModal = document.getElementById('flowerModal');
    var startGameBtn = document.getElementById('startGameBtn');
    var againBtn = document.getElementById('againBtn');
    var agreeBtn = document.getElementById('agreeBtn');
    var disagreeBtn = document.getElementById('disagreeBtn');
    var flowerImg = document.getElementById('flowerImg');

    var imgMaggot = document.getElementById('imgMaggot');
    var imgFly = document.getElementById('imgFly');
    var imgButterfly = document.getElementById('imgButterfly');
    var imgFamily = document.getElementById('imgFamily');
    var imgElope = document.getElementById('imgElope');
    var endingMessage = document.getElementById('endingMessage');
    var endingTitle = document.getElementById('endingTitle');
    var endingImgContainer = document.getElementById('endingImgContainer');
    var chartCanvas = document.getElementById('scoreChart');

    canvas.width = CW;
    canvas.height = CH;

    // ==================== 图片资源 ====================
    var images = {
        maggot: new Image(),
        pupa: new Image(),
        fly: new Image(),
        butterfly: new Image()
    };
    images.maggot.src = IMAGE_PATHS.maggot;
    images.pupa.src = IMAGE_PATHS.pupa;
    images.fly.src = IMAGE_PATHS.fly;
    images.butterfly.src = IMAGE_PATHS.butterfly;

    flowerImg.src = IMAGE_PATHS.flower;
    imgMaggot.src = IMAGE_PATHS.endingMaggot;
    imgFly.src = IMAGE_PATHS.endingFly;
    imgButterfly.src = IMAGE_PATHS.endingButterfly;
    imgFamily.src = IMAGE_PATHS.endingFamily;
    imgElope.src = IMAGE_PATHS.endingElope;

    // ==================== 游戏状态 ====================
    var playerX = (CW - PLAYER_WIDTH) / 2;
    var drops = [];
    var score = INITIAL_SCORE;
    var maifuValue = 0;
    var timeLeft = GAME_DURATION;
    var gameActive = false;
    var gameEnded = false;
    var animFrame = null;
    var timerInterval = null;
    var scoreHistory = [];
    var maifuRejected = false;

    // ==================== 工具函数 ====================
    function rectCollide(r1, r2) {
        return !(r2.x > r1.x + r1.w ||
            r2.x + r2.w < r1.x ||
            r2.y > r1.y + r1.h ||
            r2.y + r2.h < r1.y);
    }

    function getCurrentMorph() {
        if (score <= MORPH_THRESHOLDS.maggot.max) return 'maggot';
        if (score <= MORPH_THRESHOLDS.pupa.max) return 'pupa';
        if (score <= MORPH_THRESHOLDS.fly.max) return 'fly';
        return 'butterfly';
    }

    function updateMorphDisplay() {
        var morph = getCurrentMorph();
        morphIconSpan.textContent = MORPH_ICONS[morph];
        morphNameSpan.textContent = MORPH_NAMES[morph];
    }

    function recordScore() {
        scoreHistory.push({ time: timeLeft, score: score });
    }

    function updateScoreDisplay() {
        scoreSpan.textContent = score;
        if (!maifuRejected) {
            maifuSpan.textContent = maifuValue;
        }
        if (score < 0 && gameActive && !gameEnded && !maifuRejected) {
            if (maifuValue === 0) {
                showDissolveAnnounce();
            }
        }
        updateMorphDisplay();
    }

    // ==================== 音频结局 ====================
    // CanvasRenderingContext2D roundRect 兼容
    if (!CanvasRenderingContext2D.prototype.roundRect) {
        CanvasRenderingContext2D.prototype.roundRect = function(x, y, w, h, r) {
            if (w < 2 * r) r = w / 2;
            if (h < 2 * r) r = h / 2;
            this.moveTo(x + r, y);
            this.lineTo(x + w - r, y);
            this.quadraticCurveTo(x + w, y, x + w, y + r);
            this.lineTo(x + w, y + h - r);
            this.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
            this.lineTo(x + r, y + h);
            this.quadraticCurveTo(x, y + h, x, y + h - r);
            this.lineTo(x, y + r);
            this.quadraticCurveTo(x, y, x + r, y);
            return this;
        };
    }

    // ==================== 绘制函数 ====================
    function drawCanvas() {
        ctx.clearRect(0, 0, CW, CH);

        // 背景网格
        ctx.strokeStyle = '#2f5e72';
        ctx.lineWidth = 0.5;
        for (var i = 0; i < CW; i += 40) {
            ctx.beginPath();
            ctx.moveTo(i, 0);
            ctx.lineTo(i, CH);
            ctx.stroke();
        }
        for (var i = 0; i < CH; i += 40) {
            ctx.beginPath();
            ctx.moveTo(0, i);
            ctx.lineTo(CW, i);
            ctx.stroke();
        }

        // 掉落物
        for (var di = 0; di < drops.length; di++) {
            var d = drops[di];
            ctx.fillStyle = d.type.color;
            ctx.shadowColor = 'rgba(0,0,0,0.5)';
            ctx.shadowBlur = 8;
            ctx.shadowOffsetY = 3;
            ctx.beginPath();
            ctx.roundRect(d.x, d.y, DROP_WIDTH, DROP_HEIGHT, 16);
            ctx.fill();
            ctx.shadowBlur = 0;
            ctx.shadowOffsetY = 0;
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 2;
            ctx.stroke();
            ctx.font = 'bold 24px "Segoe UI", "Helvetica Neue", sans-serif';
            ctx.fillStyle = '#1a1d23';
            ctx.shadowColor = 'transparent';
            ctx.fillText(d.type.text, d.x + 10, d.y + 32);
        }

        // 玩家角色
        var morph = getCurrentMorph();
        var img = images[morph];
        if (img && img.complete && img.naturalWidth > 0) {
            ctx.drawImage(img, playerX, PLAYER_FIXED_Y, PLAYER_WIDTH, PLAYER_HEIGHT);
        } else {
            ctx.fillStyle = '#d99b4c';
            ctx.shadowBlur = 12;
            ctx.shadowColor = '#402d1a';
            ctx.beginPath();
            ctx.roundRect(playerX, PLAYER_FIXED_Y, PLAYER_WIDTH, PLAYER_HEIGHT, 30);
            ctx.fill();
            ctx.shadowBlur = 0;
            ctx.strokeStyle = '#feda7a';
            ctx.lineWidth = 3;
            ctx.stroke();
            ctx.font = 'bold 24px sans-serif';
            ctx.fillStyle = 'white';
            ctx.fillText(MORPH_ICONS[morph], playerX + 20, PLAYER_FIXED_Y + 55);
        }

        ctx.font = '18px monospace';
        ctx.fillStyle = '#e5f2c4';
        ctx.shadowBlur = 4;
        ctx.shadowColor = '#1e4c5c';
        ctx.fillText('捏捏', playerX + 10, PLAYER_FIXED_Y - 8);
    }

    function drawChart() {
        var ctxChart = chartCanvas.getContext('2d');
        var w = chartCanvas.width;
        var h = chartCanvas.height;
        ctxChart.clearRect(0, 0, w, h);

        if (scoreHistory.length < 2) return;

        var minScore = Math.min.apply(null, scoreHistory.map(function(p) { return p.score; }));
        var maxScore = Math.max.apply(null, scoreHistory.map(function(p) { return p.score; }));
        if (maxScore === minScore) {
            maxScore += 1;
            minScore -= 1;
        }
        var maxTime = 30;
        var minTime = 0;

        // 背景网格
        ctxChart.strokeStyle = '#3a6b7e';
        ctxChart.lineWidth = 0.5;
        for (var i = 0; i <= 5; i++) {
            var x = i * w / 5;
            ctxChart.beginPath();
            ctxChart.moveTo(x, 0);
            ctxChart.lineTo(x, h);
            ctxChart.stroke();
        }
        for (var i = 0; i <= 3; i++) {
            var y = i * h / 3;
            ctxChart.beginPath();
            ctxChart.moveTo(0, y);
            ctxChart.lineTo(w, y);
            ctxChart.stroke();
        }

        function mapX(t) {
            return (maxTime - t) / (maxTime - minTime) * w;
        }
        function mapY(s) {
            return h - (s - minScore) / (maxScore - minScore) * h;
        }

        // 折线
        ctxChart.beginPath();
        ctxChart.strokeStyle = '#f1c40f';
        ctxChart.lineWidth = 2;
        ctxChart.shadowColor = '#e67e22';
        ctxChart.shadowBlur = 4;

        var points = scoreHistory.map(function(p) { return { x: mapX(p.time), y: mapY(p.score) }; });
        ctxChart.moveTo(points[0].x, points[0].y);
        for (var pi = 1; pi < points.length; pi++) {
            ctxChart.lineTo(points[pi].x, points[pi].y);
        }
        ctxChart.stroke();
        ctxChart.shadowBlur = 0;

        // 数据点
        ctxChart.fillStyle = '#f39c12';
        points.forEach(function(p) {
            ctxChart.beginPath();
            ctxChart.arc(p.x, p.y, 3, 0, 2 * Math.PI);
            ctxChart.fill();
        });
    }

    // ==================== 游戏逻辑 ====================
    function updateDrops() {
        if (Math.random() < DROP_SPAWN_RATE) {
            var elapsed = GAME_DURATION - timeLeft;
            var typeIdx;
            if (elapsed >= MAIFU_SPAWN_DELAY && Math.random() < MAIFU_CHANCE) {
                typeIdx = 4; // 麦麸
            } else {
                typeIdx = Math.floor(Math.random() * 4);
            }
            var type = DROP_TYPES[typeIdx];
            drops.push({
                x: Math.random() * (CW - DROP_WIDTH),
                y: -DROP_HEIGHT,
                type: type,
                width: DROP_WIDTH,
                height: DROP_HEIGHT
            });
        }
        for (var i = drops.length - 1; i >= 0; i--) {
            drops[i].y += DROP_SPEED;
            if (drops[i].y > CH) {
                drops.splice(i, 1);
            }
        }
    }

    function addScore(delta, isMaifu) {
        if (!gameActive || gameEnded) return;
        if (isMaifu && !maifuRejected) {
            maifuValue += 1;
            playSound(maifuSound);
        } else if (!isMaifu) {
            if (delta > 0) playSound(goodSound);
            else if (delta < 0) playSound(badSound);
        }
        score += delta;
        recordScore();
        updateScoreDisplay();
    }

    function checkCollisions() {
        var playerRect = {
            x: playerX + (PLAYER_WIDTH - PLAYER_COLLIDE_W) / 2,
            y: PLAYER_FIXED_Y + (PLAYER_HEIGHT - PLAYER_COLLIDE_H) / 2,
            w: PLAYER_COLLIDE_W,
            h: PLAYER_COLLIDE_H
        };
        for (var i = drops.length - 1; i >= 0; i--) {
            var d = drops[i];
            if (rectCollide(playerRect, { x: d.x, y: d.y, w: d.width, h: d.height })) {
                addScore(d.type.score, d.type.isMaifu === true);
                drops.splice(i, 1);
            }
        }
    }

    function checkMaifuEnding() {
        if (!gameActive || gameEnded || maifuRejected) return false;

        if (maifuValue >= MAIFU_THRESHOLD) {
            pauseGameForModal();
            showFlowerModal('family');
            return true;
        }

        if (score < 0 && maifuValue > 0 && !gameEnded) {
            pauseGameForModal();
            showFlowerModal('elope');
            return true;
        }
        return false;
    }

    function pauseGameForModal() {
        gameActive = false;
        if (timerInterval) {
            clearInterval(timerInterval);
            timerInterval = null;
        }
        stopAllSounds();
    }

    // 独立的游戏循环（不在 resetGame 内定义）
    function gameLoop() {
        if (gameActive) {
            updateDrops();
            checkCollisions();
            if (!maifuRejected) {
                checkMaifuEnding();
            }
        }
        drawCanvas();
        animFrame = requestAnimationFrame(gameLoop);
    }

    // ==================== 结局逻辑 ====================
    function showFlowerModal(type) {
        flowerModal.classList.remove('hidden');
        flowerModal.dataset.pendingType = type;
    }

    function showHiddenEnding() {
        hideAllEndingImages();
        imgFamily.classList.remove('hidden');
        endingTitle.classList.add('hidden');
        endingImgContainer.classList.remove('hidden');
        endingMessage.innerHTML = '🐛 蛆蛆家族：许哥和马哥过上了幸福美好的生活，还有一堆蛆宝宝！';
        playSound(hiddenEndSound);
        drawChart();
        endModal.classList.remove('hidden');
    }

    function showElopeEnding() {
        hideAllEndingImages();
        imgElope.classList.remove('hidden');
        endingTitle.classList.add('hidden');
        endingImgContainer.classList.remove('hidden');
        endingMessage.innerHTML = '💕 私奔结局：许哥和马哥抛下一切，私奔到月球！';
        playSound(hiddenEndSound);
        drawChart();
        endModal.classList.remove('hidden');
    }

    function showDissolveAnnounce() {
        gameEnded = true;
        stopAllSounds();
        endingImgContainer.classList.add('hidden');
        endingTitle.classList.remove('hidden');
        endingTitle.textContent = 'WBG电子竞技俱乐部公告';
        var bodyText = '结束赛事后，对于监管者许立(ID:WBG.nle)比赛中的反常表现，开启了违反赛事公平性行为的调查，并且向联盟通报该情况。\n\n通过俱乐部调查取证发现捏捏疑似严重违反俱乐部规章制度及职业操守、影响赛事公平性的不正当行为。俱乐部将目前已掌握的情况上报联盟，移交联盟纪律部门调查处理。联盟纪律团队已介入调查，我们将结合联盟调查结果对该事件进行严肃处理。\n\n我俱乐部始终坚守公平竞技底线，坚决抵制影响赛事公平性等一切违规行为，对内部违规行为从严从重处理。感谢粉丝、合作伙伴及社会各界的监督，俱乐部将以此为戒，坚守职业初心，打造合规、健康、正向的电竞团队。';
        endingMessage.innerHTML = '<div class="announcement-box">' + bodyText.replace(/\n/g, '<br>') + '</div>';
        drawChart();
        endModal.classList.remove('hidden');
    }

    function showEndingByScore() {
        if (gameEnded && !endModal.classList.contains('hidden')) return;

        gameActive = false;
        gameEnded = true;
        stopAllSounds();

        endingTitle.classList.add('hidden');
        endingImgContainer.classList.remove('hidden');
        hideAllEndingImages();

        var mainMsg = '';
        if (score >= 40) {
            imgButterfly.classList.remove('hidden');
            mainMsg = '🦋 化蛆成蝶! 许哥世冠!';
            playSound(goodEndSound);
        } else if (score > 20) {
            imgFly.classList.remove('hidden');
            mainMsg = '🪰 许哥变苍蝇: 有点菜但能飞';
            playSound(badEndSound);
        } else {
            imgMaggot.classList.remove('hidden');
            mainMsg = '🐛 许哥是蛆: 爬不起来了';
            playSound(badEndSound);
        }

        endingMessage.innerHTML = mainMsg;
        drawChart();
        endModal.classList.remove('hidden');
    }

    function hideAllEndingImages() {
        imgMaggot.classList.add('hidden');
        imgFly.classList.add('hidden');
        imgButterfly.classList.add('hidden');
        imgFamily.classList.add('hidden');
        imgElope.classList.add('hidden');
    }

    // ==================== 重置游戏 ====================
    function resetGame() {
        stopAllSounds();
        if (timerInterval) {
            clearInterval(timerInterval);
            timerInterval = null;
        }
        if (animFrame) {
            cancelAnimationFrame(animFrame);
            animFrame = null;
        }

        gameActive = true;
        gameEnded = false;
        maifuRejected = false;
        drops = [];
        score = INITIAL_SCORE;
        maifuValue = 0;
        timeLeft = GAME_DURATION;
        playerX = (CW - PLAYER_WIDTH) / 2;

        maifuBox.classList.remove('broken-heart');
        updateScoreDisplay();

        // 重置心形图标
        var heartSpan = maifuBox.querySelector('span:first-child');
        if (heartSpan) heartSpan.textContent = '💕';
        maifuSpan.textContent = '0';

        scoreHistory = [{ time: GAME_DURATION, score: INITIAL_SCORE }];

        timerSpan.textContent = timeLeft;
        updateMorphDisplay();

        startModal.classList.add('hidden');
        endModal.classList.add('hidden');
        flowerModal.classList.add('hidden');

        playSound(bgmAudio);

        timerInterval = setInterval(function() {
            if (!gameActive || gameEnded) return;
            timeLeft -= 1;
            timerSpan.textContent = timeLeft >= 0 ? timeLeft : 0;
            if (timeLeft <= 0) {
                gameActive = false;
                gameEnded = true;
                clearInterval(timerInterval);
                timerInterval = null;
                showEndingByScore();
            }
        }, 1000);

        animFrame = requestAnimationFrame(gameLoop);
    }

    // ==================== 事件处理 ====================
    function handleMove(clientX, clientY) {
        if (!gameActive || gameEnded) return;
        var rect = canvas.getBoundingClientRect();
        var scaleX = CW / rect.width;
        var canvasX = (clientX - rect.left) * scaleX;
        canvasX = Math.max(0, Math.min(canvasX, CW - PLAYER_WIDTH));
        playerX = canvasX;
    }

    wrapper.addEventListener('mousemove', function(e) {
        e.preventDefault();
        handleMove(e.clientX, e.clientY);
    });
    wrapper.addEventListener('touchmove', function(e) {
        e.preventDefault();
        var touch = e.touches[0];
        if (touch) handleMove(touch.clientX, touch.clientY);
    }, { passive: false });
    wrapper.addEventListener('touchstart', function(e) {
        e.preventDefault();
        var touch = e.touches[0];
        if (touch) handleMove(touch.clientX, touch.clientY);
    }, { passive: false });

    // ==================== 按钮事件 ====================
    var audioInitialized = false;

    startGameBtn.addEventListener('click', function() {
        if (!audioInitialized) {
            initAudio();
            audioInitialized = true;
        }
        startModal.classList.add('hidden');
        resetGame();
    });

    againBtn.addEventListener('click', function() {
        endModal.classList.add('hidden');
        resetGame();
    });

    restartBtn.addEventListener('click', function() {
        startModal.classList.add('hidden');
        endModal.classList.add('hidden');
        flowerModal.classList.add('hidden');
        resetGame();
    });

    fullscreenBtn.addEventListener('click', function() {
        toggleFullscreen();
    });

    agreeBtn.addEventListener('click', function() {
        var type = flowerModal.dataset.pendingType;
        flowerModal.classList.add('hidden');
        gameEnded = true;
        if (type === 'family') {
            showHiddenEnding();
        } else if (type === 'elope') {
            showElopeEnding();
        }
    });

    disagreeBtn.addEventListener('click', function() {
        var type = flowerModal.dataset.pendingType;
        flowerModal.classList.add('hidden');
        if (type === 'family') {
            maifuRejected = true;
            maifuBox.classList.add('broken-heart');
            maifuSpan.textContent = '💢💢';
            var heartSpan = maifuBox.querySelector('span:first-child');
            if (heartSpan) heartSpan.textContent = '💔';
            gameActive = true;
            timerInterval = setInterval(function() {
                if (!gameActive || gameEnded) return;
                timeLeft -= 1;
                timerSpan.textContent = timeLeft >= 0 ? timeLeft : 0;
                if (timeLeft <= 0) {
                    gameActive = false;
                    gameEnded = true;
                    clearInterval(timerInterval);
                    timerInterval = null;
                    showEndingByScore();
                }
            }, 1000);
        } else if (type === 'elope') {
            gameEnded = true;
            showDissolveAnnounce();
        }
    });

    // ==================== 图片加载错误静默处理 ====================
    Object.keys(images).forEach(function(key) {
        images[key].onerror = function() { /* 图片加载失败，使用后备绘制 */ };
    });
    [imgMaggot, imgFly, imgButterfly, imgFamily, imgElope, flowerImg].forEach(function(img) {
        img.onerror = function() { /* 图片加载失败 */ };
    });

    // ==================== 初始化 ====================
    startModal.classList.remove('hidden');
    endModal.classList.add('hidden');
    flowerModal.classList.add('hidden');
    gameActive = false;
    gameEnded = false;
    drawCanvas();
})();
