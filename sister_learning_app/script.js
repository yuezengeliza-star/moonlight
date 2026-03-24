// 初始数据结构
const defaultProgress = {
    currentIndex: 0,
    totalPoints: 0,
    lastStudyDate: null,
    todayCompleted: false,
    dailyWords: [],
    spellIndex: 0, // 当前拼写到第几个单词
    todayRecords: [], // 今日学习记录
    currentPet: null, // 当前孵化的宠物 {type: 'dog', name: '小狗', stage: 'egg', points: 0}
    ownedPets: [] // 已拥有的成年宠物
};

// 获取本地存储进度
function getProgress() {
    const saved = localStorage.getItem('studyProgress');
    if (saved) {
        let p = JSON.parse(saved);
        if (!p.todayRecords) p.todayRecords = [];
        if (p.currentPet === undefined) {
            // 如果老用户没有currentPet字段，默认给一个蛋
            p.currentPet = { type: 'dog', name: '小狗', stage: 'egg', points: 0 };
        }
        if (!p.ownedPets) p.ownedPets = [];
        return p;
    }
    
    // 新用户默认给一个宠物蛋
    const initialProgress = { ...defaultProgress };
    initialProgress.currentPet = { type: 'dog', name: '小狗', stage: 'egg', points: 0 };
    return initialProgress;
}

// 保存进度
function saveProgress(progress) {
    localStorage.setItem('studyProgress', JSON.stringify(progress));
    updateUI();
}

// 获取今天的日期 (YYYY-MM-DD)
function getTodayDate() {
    const today = new Date();
    return `${today.getFullYear()}-${today.getMonth() + 1}-${today.getDate()}`;
}

// 初始化每日任务
function initDailyTasks() {
    let progress = getProgress();
    const today = getTodayDate();

    // 如果是新的一天，或者没有每日单词，且还没学完所有单词
    if (progress.lastStudyDate !== today) {
        if (progress.currentIndex < wordsData.length) {
            // 获取10个新单词
            const wordsToLearn = wordsData.slice(progress.currentIndex, progress.currentIndex + 10);
            progress.dailyWords = wordsToLearn;
            progress.lastStudyDate = today;
            progress.todayCompleted = false;
            progress.spellIndex = 0;
            progress.todayRecords = []; // 清空今日记录
            saveProgress(progress);
        }
    }
    return progress;
}

// --- UI 更新与事件绑定 ---

// 导航切换
document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
        // 移除所有 active 类
        document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.view-section').forEach(v => v.classList.remove('active'));
        
        // 添加当前 active 类
        e.target.classList.add('active');
        const targetId = e.target.getAttribute('data-target');
        document.getElementById(targetId).classList.add('active');
        
        updateUI(); // 切换视图时更新内容
    });
});

// 全局更新 UI
function updateUI() {
    const progress = getProgress();
    
    // 清理之前的提示
    const oldMsg = document.getElementById('no-pet-msg');
    if (oldMsg) oldMsg.remove();
    
    // 更新侧边栏积分
    document.getElementById('total-points-display').textContent = progress.totalPoints;
    
    // 更新每日状态
    const statusBox = document.getElementById('daily-status');
    if (progress.todayCompleted) {
        statusBox.textContent = "✅ 今日任务已完成";
        statusBox.className = "status-box completed";
    } else if (progress.dailyWords.length > 0) {
        statusBox.textContent = `📖 今日任务: ${progress.dailyWords.length} 词`;
        statusBox.className = "status-box pending";
    } else {
        statusBox.textContent = "🎉 词库已学完";
        statusBox.className = "status-box completed";
    }

    renderStudyView(progress);
    renderPetView(progress);
    renderProgressView(progress);
    renderStoryView(progress);
}

// 渲染今日学习页面
function renderStudyView(progress) {
    const container = document.getElementById('word-cards-container');
    const statusMsg = document.getElementById('study-status-msg');
    const spellSection = document.getElementById('spelling-section');
    const completeBtn = document.getElementById('complete-daily-btn');
    
    container.innerHTML = '';
    spellSection.style.display = 'none';
    completeBtn.style.display = 'none';

    if (progress.dailyWords.length === 0) {
        statusMsg.innerHTML = '<div class="success-msg">🎉 太棒了！你已经学完了所有单词！</div>';
        return;
    }

    if (progress.todayCompleted) {
        statusMsg.innerHTML = '<div class="success-msg">✅ 今日任务已完成！明天再来学习新的单词吧～</div>';
        return;
    }

    statusMsg.innerHTML = '';

    // 显示单词卡片（仅显示当前拼写的单词，或者完成时的状态）
    if (progress.spellIndex < progress.dailyWords.length) {
        const currentWord = progress.dailyWords[progress.spellIndex];
        
        // 渲染单个单词卡片
        const card = document.createElement('div');
        card.className = 'word-card';
        card.innerHTML = `
            <div class="word-header">
                <img src="https://api.dicebear.com/7.x/bottts/svg?seed=${currentWord.word}" alt="单词配图" class="word-img">
                <div class="word-info">
                    <div class="word-title-row">
                        <h4 class="big-word">${currentWord.word}</h4>
                        <button class="audio-btn" onclick="playAudio('${currentWord.word}')">🔊 读音</button>
                    </div>
                    <p class="pronunciation">📖 发音: ${currentWord.pronunciation}</p>
                    <p class="definition">📚 含义: ${currentWord.definition}</p>
                    <p class="example">💬 例句: ${currentWord.example_sentence}</p>
                </div>
            </div>
        `;
        container.appendChild(card);

        // 拼写逻辑
        spellSection.style.display = 'block';
        document.getElementById('current-spell-word').textContent = `提示含义: ${currentWord.definition} (${currentWord.pronunciation})`;
        document.getElementById('spell-input').value = '';
        document.getElementById('spell-input').focus();
        document.getElementById('spell-feedback').innerHTML = `进度: ${progress.spellIndex + 1} / ${progress.dailyWords.length}`;
        
        // 重置按钮状态
        const checkBtn = document.getElementById('check-spell-btn');
        checkBtn.textContent = '✅ 提交';
        checkBtn.onclick = checkSpelling; // 重新绑定事件
        
    } else {
        // 所有单词拼写完成，显示完成按钮
        spellSection.style.display = 'block';
        document.getElementById('current-spell-word').textContent = '🎉 今天的单词全部拼写正确啦！';
        document.querySelector('.input-group').style.display = 'none';
        document.getElementById('spell-feedback').textContent = '';
        completeBtn.style.display = 'block';
    }
}

// 模拟语音播放 (使用 Web Speech API)
window.playAudio = function(word) {
    if ('speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance(word);
        utterance.lang = 'en-US';
        window.speechSynthesis.speak(utterance);
    } else {
        alert("你的浏览器不支持语音朗读功能哦！");
    }
};

// 创建气球/星星动画
function createBalloons() {
    const emojis = ['🎈', '⭐', '✨', '🎉', '🎊'];
    for (let i = 0; i < 20; i++) {
        const balloon = document.createElement('div');
        balloon.className = 'balloon';
        balloon.textContent = emojis[Math.floor(Math.random() * emojis.length)];
        balloon.style.left = Math.random() * 100 + 'vw';
        balloon.style.animationDuration = (Math.random() * 1 + 1) + 's';
        document.body.appendChild(balloon);
        
        setTimeout(() => {
            balloon.remove();
        }, 2000);
    }
}

// 屏幕中央显示反馈信息
function showScreenMessage(msg, type = 'success') {
    let overlay = document.getElementById('feedback-overlay');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'feedback-overlay';
        document.body.appendChild(overlay);
    }
    overlay.textContent = msg;
    overlay.className = `feedback-overlay show ${type}`;
    
    setTimeout(() => {
        overlay.classList.remove('show');
    }, 1500);
}

// 播放纯英文提示音
function playEnglishAudio(text) {
    if ('speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'en-US';
        // 可以调整语调和语速让它听起来更欢快
        utterance.pitch = 1.2;
        utterance.rate = 1.1;
        window.speechSynthesis.speak(utterance);
    }
}

// 检查拼写函数
function checkSpelling() {
    const progress = getProgress();
    const input = document.getElementById('spell-input').value.trim().toLowerCase();
    const currentWord = progress.dailyWords[progress.spellIndex].word.toLowerCase();

    const feedback = document.getElementById('spell-feedback');
    const checkBtn = document.getElementById('check-spell-btn');

    // 找到或创建当前单词的记录
    let record = progress.todayRecords.find(r => r.word === currentWord);
    if (!record) {
        record = { word: currentWord, errors: 0, pointsEarned: 0 };
        progress.todayRecords.push(record);
    }

    if (input === currentWord) {
        progress.totalPoints += 1; // 拼对一个加1分
        record.pointsEarned += 1;
        if (progress.currentPet) {
            progress.currentPet.points += 1;
        }
        saveProgress(progress);
        
        feedback.innerHTML = '<span style="color: green;">👍 拼写正确！+1分！</span>';
        
        // 视觉高潮：正确反馈动画
        createBalloons();
        
        // 听觉鼓励与中屏显示
        const praises = ["Great!", "Good!", "Nice!", "Perfect!"];
        const praise = praises[Math.floor(Math.random() * praises.length)];
        showScreenMessage(praise, 'success');
        playEnglishAudio(praise);

        // 积分动画
        const pointsDisplay = document.getElementById('total-points-display');
        pointsDisplay.classList.remove('point-animate');
        void pointsDisplay.offsetWidth; // 触发重绘
        pointsDisplay.classList.add('point-animate');

        // 变为“下一个”按钮
        checkBtn.textContent = '➡️ 下一个单词';
        checkBtn.onclick = () => {
            let latestProgress = getProgress();
            latestProgress.spellIndex += 1;
            saveProgress(latestProgress);
            updateUI(); // 渲染下一个单词
        };
    } else {
        record.errors += 1;
        saveProgress(progress);
        feedback.innerHTML = '<span style="color: red;">❌ 拼写不对哦，再试一次！</span>';
        showScreenMessage("Try again!", 'error');
        playEnglishAudio("Try again!");
    }
}

// 移除原来的匿名事件监听，改为上面的命名函数
const oldBtn = document.getElementById('check-spell-btn');
const newBtn = oldBtn.cloneNode(true);
oldBtn.parentNode.replaceChild(newBtn, oldBtn);
newBtn.addEventListener('click', checkSpelling);

// 完成今日学习按钮
document.getElementById('complete-daily-btn').addEventListener('click', () => {
    const progress = getProgress();
    progress.todayCompleted = true;
    progress.totalPoints += 10; // 额外奖励10分
    progress.currentIndex += progress.dailyWords.length; // 索引推进
    saveProgress(progress);
    alert('🎉 太棒了！完成今日任务，获得10积分奖励！');
});

const availablePets = [
    { type: 'dog', name: '小狗', icon: '🐶', adultIcon: '🐕', price: 200 },
    { type: 'cat', name: '小猫', icon: '🐱', adultIcon: '🐈', price: 200 },
    { type: 'rabbit', name: '兔子', icon: '🐰', adultIcon: '🐇', price: 200 },
    { type: 'bird', name: '小鸟', icon: '🐣', adultIcon: '🦜', price: 200 }
];

// 渲染萌宠小屋和宠物商店
function renderPetView(progress) {
    const pts = progress.totalPoints;
    const petContainer = document.getElementById('active-pet-container');
    const storeGrid = document.getElementById('pet-store-grid');
    const wishSection = document.getElementById('wish-section');

    // 渲染商店
    if (storeGrid) {
        storeGrid.innerHTML = '';
        availablePets.forEach(pet => {
            const canBuy = pts >= pet.price && !progress.currentPet;
            const item = document.createElement('div');
            item.className = `store-item ${canBuy ? '' : 'disabled'}`;
            item.innerHTML = `
                <div class="pet-icon">${pet.icon}</div>
                <h5>${pet.name}</h5>
                <button class="action-btn" onclick="buyPet('${pet.type}')">${pet.price} 积分购买</button>
            `;
            storeGrid.appendChild(item);
        });
    }

    // 渲染当前宠物
    if (progress.currentPet) {
        petContainer.style.display = 'block';

        const petData = progress.currentPet;
        const petPoints = petData.points;
        const petInfo = availablePets.find(p => p.type === petData.type) || availablePets[0];

        const petImage = document.getElementById('pet-image');
        const petMessage = document.getElementById('pet-message');
        const petPointsDisplay = document.getElementById('pet-points-display');
        const progressBar = document.getElementById('pet-progress-bar');
        
        petPointsDisplay.textContent = petPoints;
        
        // 进度条 (最大600)
        let percent = (petPoints / 600) * 100;
        if (percent > 100) percent = 100;
        progressBar.style.width = percent + '%';

        wishSection.style.display = 'none';

        if (petPoints <= 100) {
            petImage.textContent = '🥚';
            petImage.style.backgroundColor = '#FFFFFF';
            petMessage.textContent = `你的${petInfo.name}蛋等待孵化中... 继续学习获得经验吧！`;
        } else if (petPoints <= 200) {
            petImage.textContent = petInfo.icon;
            petImage.style.backgroundColor = '#FFD700';
            petMessage.textContent = `${petInfo.name}蛋已孵化！幼年宠物好可爱！`;
        } else if (petPoints < 600) {
            petImage.textContent = petInfo.icon;
            petImage.style.backgroundColor = '#87CEEB';
            petMessage.textContent = `少年${petInfo.name}正在茁壮成长！`;
        } else {
            petImage.textContent = petInfo.adultIcon;
            petImage.style.backgroundColor = '#FFD700';
            petMessage.textContent = `成年${petInfo.name}已经准备好实现你的心愿了！你可以许愿并将其收入图鉴。`;
            wishSection.style.display = 'block';
        }
    } else {
        petContainer.style.display = 'none';
        wishSection.style.display = 'none';
        
        // 如果没有宠物，提示去商店购买
        if (document.getElementById('pet-view').classList.contains('active')) {
            petContainer.insertAdjacentHTML('beforebegin', '<div id="no-pet-msg" class="info-msg" style="text-align:center;"><p>你当前没有正在孵化的宠物哦，快去【宠物商店】挑选一个吧！</p></div>');
            petContainer.style.display = 'none';
        }
    }
}

// 购买宠物
window.buyPet = function(type) {
    const progress = getProgress();
    const petInfo = availablePets.find(p => p.type === type);
    if (progress.totalPoints >= petInfo.price && !progress.currentPet) {
        progress.totalPoints -= petInfo.price;
        progress.currentPet = {
            type: type,
            name: petInfo.name,
            stage: 'egg',
            points: 0
        };
        saveProgress(progress);
        showScreenMessage("购买成功！", 'success');
        
        // 购买成功后自动切换到萌宠小屋视图
        document.querySelector('.nav-btn[data-target="pet-view"]').click();
    } else if (progress.currentPet) {
        alert("你已经有一只宠物在孵化了，请先把它养大哦！");
    } else {
        alert("积分不够哦，快去学习赚取积分吧！");
    }
};

// 许愿功能 (并将宠物收归已有)
document.getElementById('make-wish-btn').addEventListener('click', () => {
    const wish = document.getElementById('wish-input').value.trim();
    if (wish) {
        const progress = getProgress();
        const feedback = document.getElementById('wish-feedback');
        feedback.textContent = `我已收到你的心愿：“${wish}”，我会和家长一起帮你实现它！`;
        feedback.style.display = 'block';
        document.getElementById('wish-input').value = '';

        // 将宠物移入已拥有列表，清空当前宠物
        if (progress.currentPet) {
            progress.ownedPets.push(progress.currentPet);
            progress.currentPet = null;
            saveProgress(progress);
            
            setTimeout(() => {
                alert("宠物已实现心愿并进入你的图鉴，你可以去商店挑选新的宠物蛋啦！");
            }, 1000);
        }
    }
});

// 渲染成长档案
function renderProgressView(progress) {
    document.getElementById('stat-points').textContent = progress.totalPoints;
    document.getElementById('stat-words').textContent = progress.currentIndex + (progress.todayCompleted ? 0 : progress.spellIndex);
    
    // 渲染宠物区域
    const myPetsGrid = document.getElementById('my-pets-grid');
    myPetsGrid.innerHTML = '';
    
    // 当前宠物
    if (progress.currentPet) {
        const petInfo = availablePets.find(p => p.type === progress.currentPet.type) || availablePets[0];
        let petLevel = "蛋";
        let petIcon = '🥚';
        const pts = progress.currentPet.points;
        if (pts > 100 && pts <= 200) { petLevel = "幼年"; petIcon = petInfo.icon; }
        else if (pts > 200 && pts < 600) { petLevel = "少年"; petIcon = petInfo.icon; }
        else if (pts >= 600) { petLevel = "成年"; petIcon = petInfo.adultIcon; }

        myPetsGrid.innerHTML += `
            <div class="stat-card" style="border-color: #FFD700;">
                <h4>孵化中: ${petInfo.name}</h4>
                <div style="font-size: 3rem; margin: 10px 0;">${petIcon}</div>
                <p style="font-size: 1.2rem; color: var(--gray);">等级: ${petLevel}</p>
                <p style="font-size: 1.2rem; color: var(--gray);">经验: ${pts} / 600</p>
            </div>
        `;
    } else {
        myPetsGrid.innerHTML += `
            <div class="stat-card">
                <h4>当前无孵化宠物</h4>
                <p style="font-size: 1.2rem; color: var(--gray); margin-top: 10px;">去萌宠小屋购买一个吧！</p>
            </div>
        `;
    }

    // 已拥有宠物
    progress.ownedPets.forEach(pet => {
        const petInfo = availablePets.find(p => p.type === pet.type) || availablePets[0];
        myPetsGrid.innerHTML += `
            <div class="stat-card" style="background-color: #FFF8DC;">
                <h4>已收集: ${petInfo.name}</h4>
                <div style="font-size: 3rem; margin: 10px 0;">${petInfo.adultIcon}</div>
                <p style="font-size: 1.2rem; color: var(--success);">✔ 满级</p>
            </div>
        `;
    });

    // 渲染今日学习记录
    const recordsContainer = document.getElementById('learning-records-container');
    if (progress.todayRecords && progress.todayRecords.length > 0) {
        let html = '<table class="records-table"><tr><th>单词</th><th>拼写尝试错误数</th><th>获得积分</th></tr>';
        progress.todayRecords.forEach(record => {
            html += `
                <tr>
                    <td style="font-weight: bold; color: var(--primary-blue);">${record.word}</td>
                    <td style="color: ${record.errors > 0 ? 'red' : 'green'};">${record.errors}</td>
                    <td style="color: #FFD700; font-weight: bold;">+${record.pointsEarned}</td>
                </tr>
            `;
        });
        html += '</table>';
        recordsContainer.innerHTML = html;
    } else {
        recordsContainer.innerHTML = '<p class="info-msg">今日还没有学习记录哦，快去学习吧！</p>';
    }
}

// 故事模板生成器 (智能拼接逻辑)
// 包含一个故事主干和若干个插槽，插槽根据单词的词性(名词、动词、形容词等)或者简单地将英文直接替换进对应的中文语境中
function generateSmartStory(words) {
    // 简单的人名、地名、物品名、动作等中文模板库
    const subjects = ["小红", "小明", "莉莉", "杰克"];
    const places = ["公园", "学校", "森林", "城堡", "海滩"];
    const adjs = ["神奇的", "闪闪发光的", "巨大的", "古老的", "神秘的"];
    
    let sub = subjects[Math.floor(Math.random() * subjects.length)];
    let place = places[Math.floor(Math.random() * places.length)];

    // 我们将把英文单词包装成带有中文修饰语的形式，确保读起来通顺
    // 例如：他看到了一个 [cat]，而不是生硬的 他带着 [monday] 出门
    
    // 构造故事内容
    let text = `在一个阳光明媚的日子里，${sub} 决定去 ${place} 探险。`;
    text += `在路上，${sub} 发现了一个${adjs[Math.floor(Math.random() * adjs.length)]} <strong>${words[0]}</strong>，觉得非常有趣。`;
    text += `接着，${sub} 遇到了一个好朋友，他们一起分享了关于 <strong>${words[1]}</strong> 的秘密。`;
    text += `突然，天空中出现了一个 <strong>${words[2]}</strong>，大家都惊呆了！`;
    text += `${sub} 赶紧拿出了自己的 <strong>${words[3]}</strong>，记录下了这奇妙的瞬间。`;
    text += `最后，在探险结束时，他们把一个 <strong>${words[4]}</strong> 埋在了树下，作为这次旅行的纪念。这真是难忘的一天！`;

    // 构造题目
    const question = `${sub} 去哪里探险了？`;
    const options = [
        place,
        "月球",
        "超市"
    ];
    // 随机打乱选项
    const answerIndex = Math.floor(Math.random() * 3);
    const temp = options[0];
    options[0] = options[answerIndex];
    options[answerIndex] = temp;

    return { text, question, options, answerIndex };
}

// 渲染故事剧场
function renderStoryView(progress) {
    const storyContainer = document.getElementById('story-container');
    if (!storyContainer) return;
    
    storyContainer.innerHTML = '';

    if (!progress.todayCompleted) {
        storyContainer.innerHTML = `
            <p class="info-msg" style="text-align: center; margin-top: 20px;">⚠️ 请先完成今日的 10 个单词学习，再来生成故事哦！</p>
        `;
        return;
    }

    if (progress.dailyWords.length < 10) {
        storyContainer.innerHTML = `
            <p class="info-msg" style="text-align: center; margin-top: 20px;">🎉 词库已学完或单词不足，无法生成故事！</p>
        `;
        return;
    }

    // 显示“生成今日故事”按钮
    storyContainer.innerHTML = `
        <div style="text-align: center;">
            <button id="generate-story-btn" class="primary-btn" style="margin-bottom: 20px; font-size: 1.2rem; padding: 10px 20px;">✨ 生成今日奇妙故事与测试</button>
        </div>
        <div id="story-content" style="display: none;"></div>
    `;

    document.getElementById('generate-story-btn').addEventListener('click', () => {
        const words = progress.dailyWords.map(w => w.word);
        const group1 = words.slice(0, 5);
        const group2 = words.slice(5, 10);

        let html = '';
        
        // 渲染第一个故事
        const t1 = generateSmartStory(group1);
        
        html += `
            <div class="story-box" style="background: var(--light-blue); padding: 30px; border-radius: 15px; border-left: 8px solid var(--yellow); margin-bottom: 30px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                <h4 style="color: var(--primary-blue); font-size: 1.5rem; margin-bottom: 15px;">🌟 故事一</h4>
                <p style="font-size: 1.2rem; margin-bottom: 20px; line-height: 1.8;">${t1.text}</p>
                <div class="quiz-section" style="background: var(--white); padding: 20px; border-radius: 10px; margin-top: 15px;">
                    <p style="font-weight: bold; margin-bottom: 10px;">❓ 问题：${t1.question}</p>
                    ${t1.options.map((opt, idx) => `
                        <label style="display: block; margin-bottom: 10px; cursor: pointer; padding: 10px; border: 1px solid #ddd; border-radius: 8px;">
                            <input type="radio" name="quiz1" value="${idx}"> ${opt}
                        </label>
                    `).join('')}
                    <button class="action-btn" onclick="checkQuiz(1, ${t1.answerIndex})" style="margin-top: 10px;">提交答案</button>
                    <p id="quiz1-feedback" style="margin-top: 10px; font-weight: bold;"></p>
                </div>
            </div>
        `;

        // 渲染第二个故事
        const t2 = generateSmartStory(group2);

        html += `
            <div class="story-box" style="background: var(--light-blue); padding: 30px; border-radius: 15px; border-left: 8px solid var(--primary-blue); margin-bottom: 20px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                <h4 style="color: var(--primary-blue); font-size: 1.5rem; margin-bottom: 15px;">🌟 故事二</h4>
                <p style="font-size: 1.2rem; margin-bottom: 20px; line-height: 1.8;">${t2.text}</p>
                <div class="quiz-section" style="background: var(--white); padding: 20px; border-radius: 10px; margin-top: 15px;">
                    <p style="font-weight: bold; margin-bottom: 10px;">❓ 问题：${t2.question}</p>
                    ${t2.options.map((opt, idx) => `
                        <label style="display: block; margin-bottom: 10px; cursor: pointer; padding: 10px; border: 1px solid #ddd; border-radius: 8px;">
                            <input type="radio" name="quiz2" value="${idx}"> ${opt}
                        </label>
                    `).join('')}
                    <button class="action-btn" onclick="checkQuiz(2, ${t2.answerIndex})" style="margin-top: 10px;">提交答案</button>
                    <p id="quiz2-feedback" style="margin-top: 10px; font-weight: bold;"></p>
                </div>
            </div>
        `;

        const storyContent = document.getElementById('story-content');
        storyContent.innerHTML = html;
        storyContent.style.display = 'block';
        document.getElementById('generate-story-btn').style.display = 'none';
    });
}

// 检查故事测验答案
window.checkQuiz = function(quizId, correctIndex) {
    const selected = document.querySelector(`input[name="quiz${quizId}"]:checked`);
    const feedback = document.getElementById(`quiz${quizId}-feedback`);
    
    if (!selected) {
        feedback.textContent = "请先选择一个答案哦！";
        feedback.style.color = "red";
        return;
    }

    if (parseInt(selected.value) === correctIndex) {
        feedback.textContent = "🎉 回答正确！真棒！";
        feedback.style.color = "green";
        showScreenMessage("Good Job!", "success");
        playEnglishAudio("Good Job!");
    } else {
        feedback.textContent = "❌ 哎呀，再仔细读读故事想想看？";
        feedback.style.color = "red";
    }
};

// 回车键支持 (拼写检查)
document.getElementById('spell-input').addEventListener('keypress', function (e) {
    if (e.key === 'Enter') {
        document.getElementById('check-spell-btn').click();
    }
});

// 应用启动初始化
window.onload = () => {
    initDailyTasks();
    updateUI();
};