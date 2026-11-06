/*
 * English site text — every word on the survey comes from here (or zh.js for Chinese).
 * Edit, save, reload the page.
 *
 * `items` is the master list: it decides which pills appear and in what order.
 * Each item needs a unique `id`; zh.js uses the same ids for the Chinese names.
 * Placeholders like {n} are filled in by the app.
 */
window.SURVEY_CONTENT = window.SURVEY_CONTENT || {};
window.SURVEY_CONTENT.en = {
  meta: {
    title: '∞ Underworld Supply Co. — Survey',
  },

  brand: '∞ Underworld Supply Co.',

  ui: {
    debug: 'Debugging mode',
    language: 'Language',
    back: 'Back',
    continue: 'Continue ({n}/{max})',
    submit: 'Submit',
    close: 'Close',
    sending: 'Sending…',
  },

  // the logo, clicked mid-survey
  leave: {
    title: 'Leave the survey?',
    body: 'Your picks and answers won’t be saved.',
    stay: 'Keep going',
    leave: 'Leave',
  },

  intro: {
    tagline: 'Modernized funerary effigies as a catalogue of material culture in China',
    paragraphs: [
      'In China, burning paper offerings and effigies (纸扎) has been a tradition for over a thousand years, a way of sending supplies to our ancestors and deceased relatives in the underworld. It is a wonderful gesture of love and care, but once we are gone, we rarely get a say in what we receive. Besides, do we really know what we want?',
      'After all, there are so many things we want badly but can’t enjoy in this life, whether for lack of money or time. Modern paper effigies have been catching up with popular demand, but they never keep up fully with how quickly our times change. Still, the underworld promises endless luxury and instant gratification: where else could you own a private jet for a measly $6, or an iPhone for $2?',
      'At ∞ Underworld Supply Co., we believe in giving choice and agency back to our clients by listening to individual consumers. We want to make customized paper effigies of relevant, timely goods that YOU would want to take with you, even if you were headed to the underworld tomorrow.',
      'So pause for a moment and think: If you were headed to the underworld tomorrow, what five things would you take with you?',
    ],
    start: 'Start',
    scrollTip: 'Scroll to continue', // header row, first panel only
  },

  pick: {
    headline: 'If you were headed to the underworld tomorrow, what five things would you take with you?',
    note: 'Note: Every provided option is sourced from actual online store offerings.', // under the question, with an info icon (English only)
    hint: 'Click on a floating item or drag it in the can to make a selection',
    clear: 'Clear screen',
    tip: 'Tip: Your selection doesn’t have to be an exact match as what you imagine. You can add more details on the next screen.',
    customTip: 'Tip: If this is a popular request, we may add it to our public collection! You can opt out of sharing later.',
    confirm: 'Before moving on, please make sure you’ve finalized your selection.', // Continue's check
    confirmBack: 'Keep picking',
    confirmGo: 'Continue',
    searchHint: 'Click on the search bar below to start adding items', // search mode, before a category or any typing
    other: 'Other',
    full: 'Your inventory is full — drag an item out of the tin to swap it.',
    mode: 'How to find items',
    showEverything: 'Show all objects', // categorization: every item out round the tin, by category
    textOnly: 'Show text only',
    showAll: 'Show all categories',
    search: 'Search mode',
    searchPlaceholder: 'Enter name of item...',
    settings: 'Settings',
    categories: 'Browse by categories, or search directly.',
    results: 'Search results ({n}/{total})',
    addHead: 'Add your custom item',
    add: 'Add',
  },

  details: {
    title: 'Your picks',
    continue: 'Continue',
    otherName: 'What is it?',
    otherNamePlaceholder: 'Name the item',
    variation: 'Is there a specific variation of this item you want?',
    variationPlaceholder: 'e.g. Tri-fold iPhone', // for an item without its own example
    eg: 'e.g.', // before an item's own example: 例如 e.g.：北京烤鸭 Peking duck
    reason: 'Why did you pick it?',
    reasonPlaceholder: 'This item is my top 5 because...',
  },

  about: {
    next: 'Continue',
    saveError: 'Your answers couldn’t be sent. Check your connection and press Submit again.',
    researchNote: 'Thank you for supporting my design capstone project! This survey is strictly for cultural background research and will never be publicly displayed or linked to your selected items.',
    galleryNote: 'To make this experience more fun, everyone’s selections are shared on a public gallery page. To keep your selections private, check the options below.',
    nickname: 'A nickname to show with your list in the gallery',
    publish: 'Show my wishlist on the public results page',
    showReasons: 'Show why I picked each item',
    shareCustom: 'Add my custom items to the selection, for other people to choose',
    thoughts: 'Any more thoughts to share?',
    age: 'How old are you?',
    agePlaceholder: 'Select an age range',
    ageRanges: {
      'under-18': 'Under 18',
      '18-24': '18–24',
      '25-34': '25–34',
      '35-44': '35–44',
      '45-54': '45–54',
      '55-64': '55–64',
      '65-plus': '65 or older',
    },
    heritage: 'Which of the following best describes your cultural background?',
    // saved in `heritage`; older responses may hold 'born-in-china' (born and raised there, wherever they live now)
    heritageOptions: {
      'in-greater-china': 'Born, raised, and currently living in Greater China (Mainland, HK, Macao, Taiwan)',
      'first-gen': 'Born and raised in Greater China, currently living abroad (first-generation)',
      'second-gen-plus': 'Chinese diaspora born or raised outside Greater China (second-generation or later)',
      'other-heritage': 'Other Chinese heritage or cross-cultural background',
      'none': 'I do not identify as of Chinese heritage',
    },
    residence: 'Where do you currently live?',
    residenceOptions: {
      mainland: 'Mainland China',
      'hk-macao-taiwan': 'Hong Kong / Macao / Taiwan',
      overseas: 'Outside of these regions / Abroad',
    },
    country: 'Which country or region?',
    burning: 'Have you ever burned paper money or crafted offerings (纸扎) for loved ones?',
    burningOptions: {
      'every-year': 'Yes, every year',
      occasionally: 'Yes, occasionally',
      'tried-before': 'I’ve tried it out before',
      never: 'Never',
    },
    afterlife: 'What do you believe happens after we die? If you picture an “underworld” or afterlife, what does it look like to you?',
  },

  thanks: {
    headline: 'Thank you for participating!',
    home: 'Return to home',
    results: 'See everyone’s results',
  },

  results: {
    title: '∞ Underworld Supply Co. — Public results gallery',
    headline: 'Public results gallery',
    person: '#{n}',
    visitor: 'Visitor', // next to the number when they left no nickname
    showMore: 'Show {n} more',
    loading: 'Loading wishlists…',
    error: 'Couldn’t load the results. Please try again later.',
    empty: 'No wishlists here yet.',
    local: 'Not connected to the database yet — showing only responses saved in this browser.',
    takeSurvey: 'Take the survey',
    you: 'You',
    custom: 'Custom', // the label above a write-in's own name
    demo: 'Sample data: these wishlists are made up to preview the page.',
  },

  // Categorization mode fans these out round the tin, in this order, starting top-left.
  // Each item below names its `category` by id.
  categories: [
    { id: 'hobbies', name: 'Hobbies & entertainment' },
    { id: 'luxury', name: 'Luxuries & real estate' }, // includes cars, motorcycles, jets, yachts and other big-ticket vehicles
    { id: 'tech', name: 'Technology' },
    { id: 'care', name: 'Personal care & comfort' }, // also clothing, health and mobility aids, bedding and the recliner
    { id: 'wealth', name: 'Money' }, // gold, ingots, hell money, the money tree, ATM (id kept: saved answers and the cutout folder use it)
    { id: 'food', name: 'Food' },
    { id: 'vices', name: 'Alcohol, cigarettes & tea' },
    { id: 'assistants', name: 'Assistants' }, // the AI robot and household staff
    { id: 'misc', name: 'Miscellaneous' }, // garden, gas station, ID, bikes, tricycle, theater, kitchen
  ],

  // One item per cutout in "artifact cutout/" (files are named "English - 中文.png"),
  // grouped by category. images.js pairs each id with its file.
  items: [
    // hobbies
    { id: 'mahjong-table', name: 'Mahjong table', category: 'hobbies', example: 'Automatic mahjong table' },
    { id: 'chinese-chess', name: 'Chinese chess', category: 'hobbies', example: 'Rosewood chess set' },
    { id: 'board-games', name: 'Board & card games set', category: 'hobbies', example: 'Poker & Go set' },
    { id: 'fishing-gear-set', name: 'Fishing gear set', category: 'hobbies', example: 'Carbon-fibre fishing rod' },
    { id: 'qin-chess-calligraphy-painting', name: 'Zither, chess, calligraphy & painting set', category: 'hobbies', example: 'Guqin zither' },
    { id: 'brush-ink-paper-inkstone', name: 'Brush, ink, paper & inkstone', category: 'hobbies', example: 'Hu brush & Hui ink' },

    // luxury
    { id: 'mens-watch-set', name: 'Men’s watch set', category: 'luxury', example: 'Rolex Submariner' },
    { id: 'womens-handbag', name: 'Women’s luxury handbag', category: 'luxury', example: 'Hermès Birkin' },
    { id: 'womens-jewelry', name: 'Women’s jewelry', category: 'luxury', example: 'Jade bracelet' },
    { id: 'mens-bag', name: 'Men’s leather bag', category: 'luxury', example: 'LV briefcase' },
    { id: 'villa-pool', name: 'Villa with pool', category: 'luxury', example: 'Infinity pool by the sea' },
    { id: 'tesla-with-driver', name: 'Tesla electric car with driver', category: 'luxury', example: 'Tesla Model S' },
    { id: 'mansion', name: 'Luxury mansion', category: 'luxury', example: 'Hilltop mansion with a view' },
    { id: 'villa-3-storey', name: 'Three-storey villa', category: 'luxury', example: 'Villa with a rooftop garden' },
    { id: 'wuling-ev', name: 'Wuling Hongguang electric car', category: 'luxury', example: 'Wuling Hongguang Mini EV' },
    { id: 'office-building', name: 'Office building', category: 'luxury', example: 'A tower in Lujiazui' },
    { id: 'siheyuan', name: 'Siheyuan courtyard house', category: 'luxury', example: 'Courtyard house by Houhai, Beijing' },
    { id: 'mercedes-g', name: 'Mercedes G-Class SUV', category: 'luxury', example: 'Mercedes-AMG G 63' },
    { id: 'bmw-with-driver', name: 'BMW car with driver', category: 'luxury', example: 'BMW 7 Series' },
    { id: 'helicopter', name: 'Private helicopter', category: 'luxury', example: 'Bell 505' },
    { id: 'private-jet', name: 'Private jet', category: 'luxury', example: 'Gulfstream G650' },
    { id: 'garden-villa', name: 'Garden villa', category: 'luxury', example: 'Old Shanghai garden house' },
    { id: 'courtyard-mansion', name: 'Luxury traditional courtyard mansion', category: 'luxury', example: 'Suzhou garden residence' },
    { id: 'luxury-rv', name: 'Luxury RV', category: 'luxury', example: 'Mercedes-Benz Sprinter RV' },
    { id: 'yacht', name: 'Luxury yacht', category: 'luxury', example: '30-metre superyacht' },
    { id: 'horse-carriage', name: 'Golden horse-drawn carriage', category: 'luxury', example: 'Six-horse royal carriage' },
    { id: 'motorcycle', name: 'Motorcycle', category: 'luxury', example: 'Harley-Davidson' },

    // tech
    { id: 'huawei-phone-watch', name: 'Huawei phone & smartwatch', category: 'tech', example: 'Huawei Mate 70' },
    { id: 'refrigerator', name: 'Fridge with food', category: 'tech', example: 'Haier side-by-side fridge' },
    { id: 'laptop', name: 'Laptop', category: 'tech', example: 'MacBook Pro' },
    { id: 'trifold-phone', name: 'Tri-fold phone', category: 'tech', example: 'Huawei Mate XT' },
    { id: 'washing-machine', name: 'Washing machine', category: 'tech', example: 'Washer-dryer' },
    { id: 'appliance-set', name: 'Home appliance set', category: 'tech', example: 'Smart-home appliance set' },
    { id: 'radio-cassette', name: 'Radio cassette player', category: 'tech', example: 'Panasonic double-deck boombox' },
    { id: 'apple-products', name: 'Apple products (iPhone & iPad)', category: 'tech', example: 'iPhone 17 Pro Max' },

    // care
    { id: 'boys-clothes', name: 'Boys’ clothes', category: 'care', example: 'Sports tracksuit' },
    { id: 'girls-clothes', name: 'Girls’ clothes', category: 'care', example: 'Princess dress' },
    { id: 'traditional-medicine', name: 'Traditional medicine', category: 'care', example: 'Angong Niuhuang pills' },
    { id: 'health-supplements', name: 'Health supplements', category: 'care', example: 'Bird’s nest & ginseng' },
    { id: 'makeup-set', name: 'Women’s cosmetics', category: 'care', example: 'Estée Lauder gift set' },
    { id: 'womens-clothes', name: 'Women’s clothes', category: 'care', example: 'Silk qipao' },
    { id: 'walking-cane', name: 'Walking cane', category: 'care', example: 'Carved wooden cane' },
    { id: 'massage-set', name: 'Massage & cleaning set', category: 'care', example: 'Back scratcher & foot bath' },
    { id: 'toiletries-kit', name: 'Toiletries', category: 'care', example: 'Electric toothbrush' },
    { id: 'wheelchair', name: 'Electric wheelchair', category: 'care', example: 'Foldable electric wheelchair' },
    { id: 'mens-clothes', name: 'Men’s clothes', category: 'care', example: 'Tang suit' },
    { id: 'mens-toiletries', name: 'Men’s toiletries', category: 'care', example: 'Electric shaver' },
    { id: 'bedding-set', name: 'Bedding', category: 'care', example: 'Silk duvet' },
    { id: 'recliner', name: 'Recliner', category: 'care', example: 'Massage chair' },

    // wealth
    { id: 'gold-bars', name: 'Gold bars', category: 'wealth', example: '1 kg gold bars' },
    { id: 'gold-chest', name: 'Treasure chest of gold bars', category: 'wealth', example: 'Chest of pure 999 gold' },
    { id: 'atm', name: 'ATM', category: 'wealth', example: 'An ATM that never runs dry' },
    { id: 'ingot-mountain', name: 'Mountain of gold ingots', category: 'wealth', example: 'Mountain of silver ingots' },
    { id: 'hell-money', name: 'Hell bank notes', category: 'wealth', example: '1-billion notes' },
    { id: 'money-tree', name: 'Money tree', category: 'wealth', example: 'Jade money tree' },

    // food
    { id: 'hot-pot', name: 'Chinese hot pot', category: 'food', example: 'Chongqing spicy hot pot' },
    { id: 'cake', name: 'Cake', category: 'food', example: 'Black Forest cake' },
    { id: 'wings-abalone-meal', name: 'Chicken wings & abalone meal', category: 'food', example: 'Braised abalone' },
    { id: 'dumplings', name: 'Dumplings', category: 'food', example: 'Pork & cabbage dumplings' },
    { id: 'fruit-set-standard', name: 'Fruit set (standard)', category: 'food', example: 'Durian & mangosteen' },
    { id: 'nuts-snacks', name: 'Nuts & snacks', category: 'food', example: 'Mixed nuts gift box' },
    { id: 'breakfast-set', name: 'Breakfast set', category: 'food', example: 'Soy milk & youtiao' },
    { id: 'fruit-set-b', name: 'Fruit set B', category: 'food', example: 'Cherries & lychees' },
    { id: 'fruit-desserts', name: 'Fruit & desserts', category: 'food', example: 'Mango pomelo sago' },
    { id: 'dim-sum', name: 'Hong Kong-style dim sum', category: 'food', example: 'Har gow & siu mai' },
    { id: 'bbq-set', name: 'Barbecue set', category: 'food', example: 'Lamb skewers' },
    { id: 'roast-meats', name: 'Meat set (roast duck, roast goose & cured meat)', category: 'food', example: 'Peking duck' },

    // vices
    { id: 'moutai', name: 'Moutai liquor', category: 'vices', example: 'Feitian Moutai' },
    { id: 'domestic-cigarettes', name: 'Chinese cigarettes gift box', category: 'vices', example: 'Zhonghua cigarettes' },
    { id: 'cigarettes-liquor-tea', name: 'Cigarettes, liquor & tea set', category: 'vices', example: 'Zhonghua, Moutai & Longjing' },
    { id: 'tea-set', name: 'Tea set', category: 'vices', example: 'Yixing clay teapot' },
    { id: 'tea-leaves', name: 'Tea leaves set', category: 'vices', example: 'West Lake Longjing' },
    { id: 'imported-liquor', name: 'Imported liquor', category: 'vices', example: 'Rémy Martin XO' },
    { id: 'imported-cigarettes', name: 'Imported cigarettes gift box', category: 'vices', example: 'Marlboro' },
    { id: 'cigarettes', name: 'Cigarettes', category: 'vices', example: 'Furongwang' },

    // assistants
    { id: 'ai-robot', name: 'AI robot', category: 'assistants', example: 'Robot butler' },
    { id: 'servants', name: 'Household staff', category: 'assistants', example: 'Personal chef', retired: true }, // id kept: saved answers and the cutout use it. retired: no longer pickable, still shown in submissions that have it

    // misc
    { id: 'theater', name: 'Traditional Chinese theater', category: 'misc', example: 'Peking opera troupe' },
    { id: 'bicycle', name: 'Bicycle', category: 'misc', example: 'Flying Pigeon bicycle' },
    { id: 'kitchen-cabinets', name: 'Kitchen cabinets', category: 'misc', example: 'Solid-wood cabinets' },
    { id: 'gas-station', name: 'Gas station', category: 'misc', example: 'Sinopec station' },
    { id: 'kitchen-set', name: 'Kitchen set', category: 'misc', example: 'Iron wok & cleaver' },
    { id: 'electric-tricycle', name: 'Electric tricycle', category: 'misc', example: 'Covered electric tricycle' },
    { id: 'vegetable-garden', name: 'Vegetable garden', category: 'misc', example: 'Tomatoes & bok choy' },
    { id: 'id-documents', name: 'ID documents', category: 'misc', example: 'Passport' },
  ],
};
