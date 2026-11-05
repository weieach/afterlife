/*
 * Images for the pick screen.
 *
 * `inventory` is the container in the middle of the screen.
 *
 * `files` pairs items with cutouts: add the original to "artifact cutout/", add a line here
 * keyed by the item's `id` from en.js, then run `node tools/make-web-cutouts.js`. A paired item shows its text in blue,
 * floats its image above the pill on hover / drag, turns into just the image
 * once it's in the inventory, and shows the image on its detail card.
 * Items without an entry stay plain pills.
 * Cutouts load the first time they're needed and are cached after that,
 * so the list can grow without slowing the first load.
 *
 * `colors` gives each category one colour: the background of its entries in the search list,
 * and the square behind an item's image on its detail card. The noise thumbnail for typed-in items drifts through all of them.
 */
window.SURVEY_IMAGES = {
  inventory: '../assets/cookie can (web).png', // relative to survey/index.html

  // Web-sized copies (600px WebP) of the originals in "artifact cutout/", sorted into one
  // subfolder per category. Rebuild with `node tools/make-web-cutouts.js` after adding a cutout or
  // moving an item to another category in en.js.
  base: '../artifact cutout (web, by category)/', // relative to survey/index.html

  // category id (from en.js) -> its subfolder in `base`
  folders: {
    'hobbies': '01 Hobbies & entertainment - 爱好与娱乐',
    'luxury': '02 Luxuries & real estate - 奢侈品与房产',
    'tech': '03 Technology - 科技',
    'care': '04 Personal care & comfort - 个人起居',
    'wealth': '05 Wealth - 财富',
    'food': '06 Food - 食品',
    'vices': '07 Alcohol, cigarettes & tea - 烟酒茶',
    'assistants': '08 Assistants - 助手',
    'misc': '09 Miscellaneous - 杂项',
  },
  files: {
    'ai-robot': 'AI robot - AI机器人.webp',
    'huawei-phone-watch': 'Huawei phone & smartwatch - 华为手机与智能手表.webp',
    'refrigerator': 'Fridge with food - 冰箱（装满食物）.webp',
    'laptop': 'Laptop - 笔记本电脑.webp',
    'trifold-phone': 'Tri-fold phone - 三折叠手机.webp',
    'washing-machine': 'Washing machine - 洗衣机.webp',
    'appliance-set': 'Home appliance set - 家电套装.webp',
    'radio-cassette': 'Radio cassette player - 收录音机.webp',
    'apple-products': 'Apple products (iPhone & iPad) - 苹果电子产品：iPhone手机，iPad.webp',
    'mens-watch-set': "Men's watch set - 男士手表套装.webp",
    'womens-handbag': "Women's luxury handbag - 女士奢侈品手包.webp",
    'womens-jewelry': "Women's jewelry - 女士首饰.webp",
    'mens-bag': "Men's leather bag - 男士皮包.webp",
    'gold-bars': 'Gold bars - 金条.webp',
    'gold-chest': 'Treasure chest of gold bars - 金条百宝箱.webp',
    'hot-pot': 'Chinese hot pot - 中式火锅.webp',
    'moutai': 'Moutai liquor - 茅台酒.webp',
    'cake': 'Cake - 蛋糕.webp',
    'wings-abalone-meal': 'Chicken wings & abalone meal - 鸡翅鲍鱼套餐.webp',
    'dumplings': 'Dumplings - 水饺.webp',
    'fruit-set-standard': 'Fruit set (standard) - 水果套装（标准款）.webp',
    'domestic-cigarettes': 'Chinese cigarettes gift box - 国产烟套盒.webp',
    'nuts-snacks': 'Nuts & snacks - 坚果点心.webp',
    'breakfast-set': 'Breakfast set - 早餐一套.webp',
    'fruit-set-b': 'Fruit set B - 水果套装B.webp',
    'fruit-desserts': 'Fruit & desserts - 水果甜品.webp',
    'dim-sum': 'Hong Kong-style dim sum - 港式早点.webp',
    'cigarettes-liquor-tea': 'Cigarettes, liquor & tea set - 烟酒茶套装.webp',
    'bbq-set': 'Barbecue set - 烧烤套装.webp',
    'roast-meats': 'Meat set (roast duck, roast goose & cured meat) - 肉类套装：烤鸭 烧鹅 腊肉.webp',
    'tea-set': 'Tea set - 茶具.webp',
    'tea-leaves': 'Tea leaves set - 茶叶套装.webp',
    'imported-liquor': 'Imported liquor - 进口洋酒.webp',
    'imported-cigarettes': 'Imported cigarettes gift box - 进口烟套盒.webp',
    'cigarettes': 'Cigarettes - 香烟.webp',
    'mahjong-table': 'Mahjong table - 麻将桌.webp',
    'chinese-chess': 'Chinese chess - 中国象棋.webp',
    'theater': 'Traditional Chinese theater - 中式传统戏院.webp',
    'board-games': 'Board & card games set - 棋牌套装.webp',
    'fishing-gear-set': 'Fishing gear set - 渔具套装.webp',
    'qin-chess-calligraphy-painting': 'Zither, chess, calligraphy & painting set - 琴棋书画套装.webp',
    'brush-ink-paper-inkstone': 'Brush, ink, paper & inkstone - 笔墨纸砚.webp',
    'boys-clothes': "Boys' clothes - 男童服装.webp",
    'girls-clothes': "Girls' clothes - 女童服装.webp",
    'traditional-medicine': 'Traditional medicine - 传统药品.webp',
    'health-supplements': 'Health supplements - 养生补品.webp',
    'makeup-set': "Women's cosmetics - 女士化妆品.webp",
    'womens-clothes': "Women's clothes - 女士服装.webp",
    'walking-cane': 'Walking cane - 拐杖.webp',
    'massage-set': 'Massage & cleaning set - 按摩清理套装.webp',
    'toiletries-kit': 'Toiletries - 洗漱用品.webp',
    'wheelchair': 'Electric wheelchair - 电动轮椅.webp',
    'mens-clothes': "Men's clothes - 男士服装.webp",
    'mens-toiletries': "Men's toiletries - 男士洗漱用品.webp",
    'villa-pool': 'Villa with pool - 泳池别墅.webp',
    'tesla-with-driver': 'Tesla electric car with driver - 特斯拉电动车（配司机）.webp',
    'bicycle': 'Bicycle - 自行车.webp',
    'kitchen-cabinets': 'Kitchen cabinets - 厨房橱柜.webp',
    'mansion': 'Luxury mansion - 豪华别墅.webp',
    'villa-3-storey': 'Three-storey villa - 三层别墅.webp',
    'wuling-ev': 'Wuling Hongguang electric car - 五菱宏光电动车.webp',
    'gas-station': 'Gas station - 加油站.webp',
    'kitchen-set': 'Kitchen set - 厨房套装.webp',
    'office-building': 'Office building - 商用写字楼.webp',
    'siheyuan': 'Siheyuan courtyard house - 四合院.webp',
    'mercedes-g': 'Mercedes G-Class SUV - 奔驰大G越野车.webp',
    'bmw-with-driver': 'BMW car with driver - 宝马汽车（配司机）.webp',
    'bedding-set': 'Bedding - 床品.webp',
    'motorcycle': 'Motorcycle - 摩托车.webp',
    'electric-tricycle': 'Electric tricycle - 电动三轮车.webp',
    'helicopter': 'Private helicopter - 私人直升机.webp',
    'private-jet': 'Private jet - 私人飞机.webp',
    'garden-villa': 'Garden villa - 花园洋楼.webp',
    'vegetable-garden': 'Vegetable garden - 菜园.webp',
    'courtyard-mansion': 'Luxury traditional courtyard mansion - 豪华传统宅院.webp',
    'luxury-rv': 'Luxury RV - 豪华房车.webp',
    'yacht': 'Luxury yacht - 豪华游艇.webp',
    'recliner': 'Recliner - 躺椅.webp',
    'horse-carriage': 'Golden horse-drawn carriage - 马拉金车.webp',
    'servants': 'Servants - 佣人.webp',
    'atm': 'ATM - 自动取款机.webp',
    'ingot-mountain': 'Mountain of gold ingots - 元宝山.webp',
    'hell-money': 'Hell bank notes - 冥府纸币.webp',
    'money-tree': 'Money tree - 摇钱树.webp',
    'id-documents': 'ID documents - 证件.webp',
  },

  // category id (from en.js) -> its colour: mid-tone, so the cutouts still stand out
  colors: {
    'hobbies': '#3FA596', // teal
    'luxury': '#8E68C9', // purple
    'tech': '#3F8BD6', // blue
    'care': '#DB5C93', // peony pink
    'wealth': '#E2B33A', // gold yellow
    'food': '#EE8A3E', // tangerine orange
    'vices': '#C9424F', // cherry red
    'assistants': '#98A552', // olive
    'misc': '#4C9D62', // green
  },
};
