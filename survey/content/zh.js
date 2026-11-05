/*
 * 中文网站文案 — Chinese site text. Mirrors the keys in en.js.
 * Anything missing here falls back to the English in en.js.
 *
 * `items` are matched to en.js by `id`. To add an item, add it to en.js first
 * (that list decides which pills appear), then add its Chinese name here.
 * Item names below are the original shop listing names.
 */
window.SURVEY_CONTENT = window.SURVEY_CONTENT || {};
window.SURVEY_CONTENT.zh = {
  meta: {
    title: '∞ 冥界供销无限公司 — 问卷',
  },

  brand: '冥界供销无限公司',

  ui: {
    debug: '调试模式',
    language: '语言',
    back: '返回',
    continue: '继续', // no counter in Chinese; the English line under it has one
    submit: '提交',
    close: '关闭',
    sending: '提交中…',
  },

  // the logo, clicked mid-survey
  leave: {
    title: '要离开问卷吗？',
    body: '你选的物品和填写的答案都不会被保存。',
    stay: '继续填写',
    leave: '离开',
  },

  intro: {
    tagline: '现代纸扎：一份关于中国物质文化的商品目录',
    paragraphs: [
      '焚烧纸钱与纸扎祭品是中国延续了上千年的传统，寄托着我们对祖先和逝去亲人的思念，希望能为他们在冥界备齐所需；可等到我们自己离开的那一天，却往往无法决定自己会收到些什么。与此同时，我们真的知道自己想要什么吗？',
      '牛马一生，我们缺钱，亦或者缺时间；这辈子有太多我们渴望却无缘享受到的东西。现代的的纸扎产品多出了豪宅跑车，却赶不上欲望翻新的速度。但话说回来，冥界所许诺的，本就是无尽的物质与即时的满足。还有哪里能让你花40块钱就喜提一架私人飞机、花14块钱就入手一部iPhone呢？',
      '在冥界供销无限公司，我们相信应当倾听每一位消费者的声音，把选择权和主动权交还给顾客。我们希望为你定制切合当下、紧跟时代的纸扎商品——那些即使明天就要前往冥界，“你”也想随身带走的东西。',
      '所以，不妨停下来想一想：假如明天就要去阴间报到，你想带走哪五样东西？',
    ],
    start: '开始',
    scrollTip: '下滑以继续',
  },

  pick: {
    headline: '假如明天就要去阴间报到，你想带走哪五样东西？',
    hint: '点击屏幕中漂浮的物品，或将其拖到铁罐中进行选择',
    clear: '清空屏幕',
    tip: '提示：如果此时你的选择和心中所想不完全一致，后续有机会补充更多细节。',
    customTip: '提示：热门的自定义物品可能会被收录至公共列表！您也可以在随后的问卷中选择不公开。',
    confirm: '进入下一步之前，请确认你已经选好了想带走的物品。',
    confirmBack: '再看看',
    confirmGo: '确认，继续',
    searchHint: '点击下方的搜索栏，开始添加物品',
    other: '其他',
    full: '你的清单已满——请先把一件拖出铁盒，再换上新的。',
    mode: '查找物品的方式',
    showEverything: '全部展示',
    textOnly: '仅显示文字',
    showAll: '显示全部类别',
    search: '搜索模式',
    searchPlaceholder: '输入物品名称',
    settings: '设置',
    categories: '从已有类别中挑选，或直接搜索',
    results: '搜索结果',
    addHead: '从下方添加你的自定义物品',
    add: '添加',
  },

  details: {
    title: '你的选择',
    continue: '继续',
    otherName: '这是什么？',
    otherNamePlaceholder: '为它取个名字',
    variation: '你想要这件物品的某个具体款式吗？',
    variationPlaceholder: '例如：三折叠 iPhone',
    eg: '例如',
    reason: '为什么选这件物品？',
    reasonPlaceholder: '它能进入我的前五名，是因为……',
  },

  about: {
    next: '继续',
    saveError: '你的回答未能发送。请检查网络连接后再次点击提交。',
    researchNote: '感谢支持我的毕业设计调研！本页问卷仅用于项目的文化背景研究，绝不会与您的物品选择关联或公开展示。',
    galleryNote: '为了让体验更有趣，我做了一个公共展厅来展示大家的选择列表！如果有你不希望公开的信息，请调整下方选项。',
    nickname: '在展厅中与你的列表一起显示的昵称',
    publish: '在公开的结果页面展示我的心愿单',
    showReasons: '展示我选择每件物品的理由',
    shareCustom: '把我自定义的物品加入可选列表，供其他人选择',
    thoughts: '还有什么想和我们分享的吗？',
    age: '你的年龄是？',
    agePlaceholder: '请选择年龄段',
    ageRanges: {
      'under-18': '18岁以下',
      '18-24': '18–24岁',
      '25-34': '25–34岁',
      '35-44': '35–44岁',
      '45-54': '45–54岁',
      '55-64': '55–64岁',
      '65-plus': '65岁及以上',
    },
    heritage: '以下哪项最符合你的文化与成长背景？',
    heritageOptions: {
      'in-greater-china': '在大中华区（大陆、港澳台）出生长大，目前仍在此生活',
      'first-gen': '在大中华区出生长大，目前在海外留学、工作或定居（第一代移居）',
      'second-gen-plus': '在海外出生或长大的华裔（第二代或更晚的海外华裔）',
      'other-heritage': '其他华人/华裔背景（如跨国成长、回流等）',
      'none': '我没有华人或华裔背景',
    },
    residence: '你目前居住在哪里？',
    residenceOptions: {
      mainland: '中国大陆',
      'hk-macao-taiwan': '中国香港 / 澳门 / 台湾',
      overseas: '海外 / 其他国家或地区',
    },
    country: '具体是哪个国家或地区？',
    burning: '你有过给故人烧过纸钱或纸扎的经历吗？',
    burningOptions: {
      'every-year': '参与过，每年都会',
      occasionally: '参与过，偶尔',
      'tried-before': '尝试过一两次',
      never: '从来没有',
    },
    afterlife: '你相信有死后的世界吗？如果你相信，你心目中的那个世界是什么样的？',
  },

  thanks: {
    headline: '感谢你的参与！',
    home: '返回首页',
    results: '查看其他人的结果',
  },

  results: {
    title: '∞ 冥界供销无限公司 — 征集结果展厅',
    headline: '征集结果展厅',
    person: '#{n}', // same in both: shows once
    visitor: '访客',
    showMore: '再显示 {n} 位',
    loading: '正在加载心愿单……',
    error: '结果加载失败，请稍后再试。',
    empty: '这里还没有心愿单。',
    local: '尚未连接数据库——仅显示保存在此浏览器中的回答。',
    takeSurvey: '参与问卷',
    you: '你',
    custom: '自定义', // the label above a write-in's own name
    demo: '示例数据：这些心愿单是为预览页面虚构的。',
  },

  categories: [
    { id: 'hobbies', name: '爱好与娱乐' },
    { id: 'luxury', name: '奢侈品与房产' },
    { id: 'tech', name: '科技' },
    { id: 'care', name: '个人起居' },
    { id: 'wealth', name: '财富' },
    { id: 'food', name: '食品' },
    { id: 'vices', name: '烟酒茶' },
    { id: 'assistants', name: '助手' },
    { id: 'misc', name: '杂项' },
  ],

  // Chinese names, matched to en.js by id.
  items: [
    // hobbies
    { id: 'mahjong-table', name: '麻将桌', example: '全自动麻将桌' },
    { id: 'chinese-chess', name: '中国象棋', example: '红木象棋' },
    { id: 'board-games', name: '棋牌套装', example: '扑克和围棋' },
    { id: 'fishing-gear-set', name: '渔具套装', example: '碳素钓鱼竿' },
    { id: 'qin-chess-calligraphy-painting', name: '琴棋书画套装', example: '古琴' },
    { id: 'brush-ink-paper-inkstone', name: '笔墨纸砚', example: '湖笔徽墨' },

    // luxury
    { id: 'mens-watch-set', name: '男士手表套装', example: '劳力士潜航者' },
    { id: 'womens-handbag', name: '女士奢侈品手包', example: '爱马仕铂金包' },
    { id: 'womens-jewelry', name: '女士首饰', example: '翡翠手镯' },
    { id: 'mens-bag', name: '男士皮包', example: 'LV 公文包' },
    { id: 'villa-pool', name: '泳池别墅', example: '海景无边泳池' },
    { id: 'tesla-with-driver', name: '特斯拉电动车（配司机）', example: '特斯拉 Model S' },
    { id: 'mansion', name: '豪华别墅', example: '半山观景豪宅' },
    { id: 'villa-3-storey', name: '三层别墅', example: '带屋顶花园的别墅' },
    { id: 'wuling-ev', name: '五菱宏光电动车', example: '五菱宏光 MINI EV' },
    { id: 'office-building', name: '商用写字楼', example: '陆家嘴写字楼' },
    { id: 'siheyuan', name: '四合院', example: '北京后海四合院' },
    { id: 'mercedes-g', name: '奔驰大G越野车', example: '奔驰 AMG G63' },
    { id: 'bmw-with-driver', name: '宝马汽车（配司机）', example: '宝马 7 系' },
    { id: 'helicopter', name: '私人直升机', example: '贝尔 505' },
    { id: 'private-jet', name: '私人飞机', example: '湾流 G650' },
    { id: 'garden-villa', name: '花园洋楼', example: '上海老洋房' },
    { id: 'courtyard-mansion', name: '豪华传统宅院', example: '苏州园林宅院' },
    { id: 'luxury-rv', name: '豪华房车', example: '奔驰斯宾特房车' },
    { id: 'yacht', name: '豪华游艇', example: '30 米超级游艇' },
    { id: 'horse-carriage', name: '马拉金车', example: '六驾马车' },
    { id: 'motorcycle', name: '摩托车', example: '哈雷摩托' },

    // tech
    { id: 'huawei-phone-watch', name: '华为手机与智能手表', example: '华为 Mate 70' },
    { id: 'refrigerator', name: '冰箱（装满食物）', example: '海尔对开门冰箱' },
    { id: 'laptop', name: '笔记本电脑', example: 'MacBook Pro' },
    { id: 'trifold-phone', name: '三折叠手机', example: '华为 Mate XT' },
    { id: 'washing-machine', name: '洗衣机', example: '洗烘一体机' },
    { id: 'appliance-set', name: '家电套装', example: '全套智能家电' },
    { id: 'radio-cassette', name: '收录音机', example: '松下双卡录音机' },
    { id: 'apple-products', name: '苹果电子产品：iPhone手机，iPad', example: 'iPhone 17 Pro Max' },

    // care
    { id: 'boys-clothes', name: '男童服装', example: '运动套装' },
    { id: 'girls-clothes', name: '女童服装', example: '公主裙' },
    { id: 'traditional-medicine', name: '传统药品', example: '安宫牛黄丸' },
    { id: 'health-supplements', name: '养生补品', example: '燕窝人参' },
    { id: 'makeup-set', name: '女士化妆品', example: '雅诗兰黛套装' },
    { id: 'womens-clothes', name: '女士服装', example: '真丝旗袍' },
    { id: 'walking-cane', name: '拐杖', example: '雕花木拐杖' },
    { id: 'massage-set', name: '按摩清理套装', example: '痒痒挠和泡脚盆' },
    { id: 'toiletries-kit', name: '洗漱用品', example: '电动牙刷' },
    { id: 'wheelchair', name: '电动轮椅', example: '折叠电动轮椅' },
    { id: 'mens-clothes', name: '男士服装', example: '唐装' },
    { id: 'mens-toiletries', name: '男士洗漱用品', example: '电动剃须刀' },
    { id: 'bedding-set', name: '床品', example: '蚕丝被' },
    { id: 'recliner', name: '躺椅', example: '按摩椅' },

    // wealth
    { id: 'gold-bars', name: '金条', example: '1 公斤金条' },
    { id: 'gold-chest', name: '金条百宝箱', example: '足金百宝箱' },
    { id: 'atm', name: '自动取款机', example: '取之不尽的取款机' },
    { id: 'ingot-mountain', name: '元宝山', example: '银元宝山' },
    { id: 'hell-money', name: '冥府纸币', example: '十亿面值冥币' },
    { id: 'money-tree', name: '摇钱树', example: '玉石摇钱树' },

    // food
    { id: 'hot-pot', name: '中式火锅', example: '重庆麻辣火锅' },
    { id: 'cake', name: '蛋糕', example: '黑森林蛋糕' },
    { id: 'wings-abalone-meal', name: '鸡翅鲍鱼套餐', example: '红烧鲍鱼' },
    { id: 'dumplings', name: '水饺', example: '猪肉白菜饺子' },
    { id: 'fruit-set-standard', name: '水果套装（标准款）', example: '榴莲山竹' },
    { id: 'nuts-snacks', name: '坚果点心', example: '每日坚果礼盒' },
    { id: 'breakfast-set', name: '早餐一套', example: '豆浆油条' },
    { id: 'fruit-set-b', name: '水果套装B', example: '车厘子和荔枝' },
    { id: 'fruit-desserts', name: '水果甜品', example: '杨枝甘露' },
    { id: 'dim-sum', name: '港式早点', example: '虾饺烧卖' },
    { id: 'bbq-set', name: '烧烤套装', example: '羊肉串' },
    { id: 'roast-meats', name: '肉类套装：烤鸭 烧鹅 腊肉', example: '北京烤鸭' },

    // vices
    { id: 'moutai', name: '茅台酒', example: '飞天茅台' },
    { id: 'domestic-cigarettes', name: '国产烟套盒', example: '中华香烟' },
    { id: 'cigarettes-liquor-tea', name: '烟酒茶套装', example: '中华、茅台、龙井' },
    { id: 'tea-set', name: '茶具', example: '宜兴紫砂壶' },
    { id: 'tea-leaves', name: '茶叶套装', example: '西湖龙井' },
    { id: 'imported-liquor', name: '进口洋酒', example: '人头马 XO' },
    { id: 'imported-cigarettes', name: '进口烟套盒', example: '万宝路' },
    { id: 'cigarettes', name: '香烟', example: '芙蓉王' },

    // assistants
    { id: 'ai-robot', name: 'AI机器人', example: '机器人管家' },
    { id: 'servants', name: '佣人', example: '私人厨师' },

    // misc
    { id: 'theater', name: '中式传统戏院', example: '京剧戏班' },
    { id: 'bicycle', name: '自行车', example: '飞鸽自行车' },
    { id: 'kitchen-cabinets', name: '厨房橱柜', example: '实木橱柜' },
    { id: 'gas-station', name: '加油站', example: '中石化加油站' },
    { id: 'kitchen-set', name: '厨房套装', example: '铁锅菜刀' },
    { id: 'electric-tricycle', name: '电动三轮车', example: '带棚电动三轮车' },
    { id: 'vegetable-garden', name: '菜园', example: '番茄和青菜' },
    { id: 'id-documents', name: '证件', example: '护照' },
  ],
};
