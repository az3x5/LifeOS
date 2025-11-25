import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dataDir = path.join(__dirname, '..', 'data', 'islamic');

console.log('🚀 Parsing Hisn al-Muslim collection...\n');

// Load the Hisn al-Muslim file
const hisnPath = path.join(dataDir, 'hisn-almuslim-complete.json');
const hisnData = JSON.parse(fs.readFileSync(hisnPath, 'utf8'));

// Skip introduction and virtue of dhikr
const skipKeys = ['المقدمة', 'فضل الذكر'];
const arabicCategories = Object.keys(hisnData).filter(k => !skipKeys.includes(k));

console.log(`📚 Found ${arabicCategories.length} categories in Hisn al-Muslim\n`);

// Map Arabic category names to English with icons and colors
const categoryMapping = {
    'أذكار الاستيقاظ من النوم': { name: 'Upon Waking Up', icon: 'wb_twilight', color: '#FFA726' },
    'دعاء لبس الثوب': { name: 'Wearing Clothes', icon: 'checkroom', color: '#66BB6A' },
    'دعاء لبس الثوب الجديد': { name: 'Wearing New Clothes', icon: 'new_releases', color: '#42A5F5' },
    'الدعاء لمن لبس ثوباً جديداً': { name: 'Dua for Someone Wearing New Clothes', icon: 'volunteer_activism', color: '#AB47BC' },
    'ما يقول إذا وضع الثوب': { name: 'Removing Clothes', icon: 'checkroom', color: '#26A69A' },
    'دعاء دخول الخلاء': { name: 'Entering Toilet', icon: 'wc', color: '#78909C' },
    'دعاء الخروج من الخلاء': { name: 'Leaving Toilet', icon: 'wc', color: '#78909C' },
    'الذكر قبل الوضوء': { name: 'Before Wudu', icon: 'water_drop', color: '#03A9F4' },
    'الذكر بعد الفراغ من الوضوء': { name: 'After Wudu', icon: 'water_drop', color: '#03A9F4' },
    'الذكر عند الخروج من المنزل': { name: 'Leaving Home', icon: 'home', color: '#9C27B0' },
    'الذكر عند دخول المنزل': { name: 'Entering Home', icon: 'home', color: '#9C27B0' },
    'دعاء الذهاب إلى المسجد': { name: 'Going to Mosque', icon: 'mosque', color: '#4CAF50' },
    'دعاء دخول المسجد': { name: 'Entering Mosque', icon: 'mosque', color: '#4CAF50' },
    'دعاء الخروج من المسجد': { name: 'Leaving Mosque', icon: 'mosque', color: '#4CAF50' },
    'أذكار الأذان': { name: 'Upon Hearing Adhan', icon: 'notifications_active', color: '#FF9800' },
    'دعاء الاستفتاح': { name: 'Opening Prayer', icon: 'prayer_times', color: '#66BB6A' },
    'دعاء الركوع': { name: 'During Ruku', icon: 'self_improvement', color: '#66BB6A' },
    'دعاء الرفع من الركوع': { name: 'Rising from Ruku', icon: 'self_improvement', color: '#66BB6A' },
    'دعاء السجود': { name: 'During Sujud', icon: 'self_improvement', color: '#66BB6A' },
    'دعاء الجلسة بين السجدتين': { name: 'Between Two Sujud', icon: 'self_improvement', color: '#66BB6A' },
    'دعاء سجود التلاوة': { name: 'Prostration of Recitation', icon: 'menu_book', color: '#AB47BC' },
    'التشهد': { name: 'Tashahhud', icon: 'prayer_times', color: '#66BB6A' },
    'الصلاة على النبي بعد التشهد': { name: 'Salawat After Tashahhud', icon: 'favorite', color: '#E91E63' },
    'الدعاء بعد التشهد الأخير قبل السلام': { name: 'Before Salam', icon: 'prayer_times', color: '#66BB6A' },
    'أذكار بعد السلام من الصلاة': { name: 'After Salah', icon: 'done_all', color: '#4CAF50' },
    'دعاء صلاة الاستخارة': { name: 'Istikhara Prayer', icon: 'help', color: '#9C27B0' },
    'أذكار الصباح': { name: 'Morning Adhkar', icon: 'wb_sunny', color: '#FFA726' },
    'أذكار المساء': { name: 'Evening Adhkar', icon: 'nights_stay', color: '#5C6BC0' },
    'دعاء من استصعب عليه أمر': { name: 'When Facing Difficulty', icon: 'warning', color: '#FF5722' },
    'ما يقول ويفعل من أذنب ذنباً': { name: 'After Committing Sin', icon: 'healing', color: '#EF5350' },
    'دعاء طرد الشيطان ووساوسه': { name: 'Against Satan & Whispers', icon: 'shield', color: '#42A5F5' },
    'الدعاء حينما يقع ما لا يرضاه أو غلب على أمره': { name: 'When Something Undesirable Happens', icon: 'sentiment_dissatisfied', color: '#FF9800' },
    'تهنئة المولود له وجوابه': { name: 'Congratulating New Parents', icon: 'child_care', color: '#E91E63' },
    'ما يعوذ به الأولاد': { name: 'Protection for Children', icon: 'shield', color: '#42A5F5' },
    'الدعاء للمريض في عيادته': { name: 'Visiting the Sick', icon: 'local_hospital', color: '#26A69A' },
    'فضل عيادة المريض': { name: 'Virtue of Visiting Sick', icon: 'volunteer_activism', color: '#26A69A' },
    'دعاء المريض الذي يئس من حياته': { name: 'Dying Person\'s Dua', icon: 'favorite_border', color: '#78909C' },
    'تلقين المحتضر': { name: 'Prompting Dying Person', icon: 'record_voice_over', color: '#78909C' },
    'دعاء من أصيب بمصيبة': { name: 'Upon Calamity', icon: 'crisis_alert', color: '#FF5722' },
    'الدعاء عند إغماض الميت': { name: 'Closing Eyes of Deceased', icon: 'visibility_off', color: '#607D8B' },
    'الدعاء للميت في الصلاة عليه': { name: 'Funeral Prayer', icon: 'mosque', color: '#607D8B' },
    'دعاء التعزية': { name: 'Condolence', icon: 'handshake', color: '#607D8B' },
    'الدعاء عند إدخال الميت القبر': { name: 'Placing in Grave', icon: 'landscape', color: '#607D8B' },
    'دعاء زيارة القبور': { name: 'Visiting Graves', icon: 'landscape', color: '#607D8B' },
    'دعاء الريح': { name: 'During Wind', icon: 'air', color: '#90A4AE' },
    'دعاء الرعد': { name: 'During Thunder', icon: 'thunderstorm', color: '#5C6BC0' },
    'دعاء المطر': { name: 'During Rain', icon: 'rainy', color: '#42A5F5' },
    'الذكر بعد نزول المطر': { name: 'After Rain', icon: 'rainy', color: '#42A5F5' },
    'من أدعية الاستسقاء': { name: 'Seeking Rain', icon: 'water_drop', color: '#03A9F4' },
    'دعاء رؤية الهلال': { name: 'Seeing New Moon', icon: 'nightlight', color: '#5C6BC0' },
    'الدعاء عند إفطار الصائم': { name: 'Breaking Fast', icon: 'restaurant', color: '#FF9800' },
    'الدعاء قبل الطعام': { name: 'Before Eating', icon: 'restaurant', color: '#FF9800' },
    'الدعاء عند الفراغ من الطعام': { name: 'After Eating', icon: 'restaurant', color: '#FF9800' },
    'دعاء الضيف لصاحب الطعام': { name: 'Guest\'s Dua for Host', icon: 'dining', color: '#FF9800' },
    'التعريض بالدعاء لطلب الطعام أو الشراب': { name: 'Hinting for Food/Drink', icon: 'local_cafe', color: '#795548' },
    'الدعاء إذا أفطر عند أهل بيت': { name: 'Breaking Fast at Someone\'s Home', icon: 'home', color: '#FF9800' },
    'دعاء الصائم إذا حضر الطعام ولم يفطر': { name: 'Fasting Person at Meal', icon: 'no_meals', color: '#FF9800' },
    'ما يقول الصائم إذا سابه أحد': { name: 'When Insulted While Fasting', icon: 'block', color: '#F44336' },
    'الدعاء عند رؤية باكورة الثمر': { name: 'Seeing First Fruits', icon: 'nutrition', color: '#8BC34A' },
    'دعاء العطاس': { name: 'Sneezing', icon: 'sick', color: '#FF9800' },
    'ما يقال للكافر إذا عطس فحمد الله': { name: 'Non-Muslim Sneezes', icon: 'diversity_3', color: '#9E9E9E' },
    'الدعاء للمتزوج': { name: 'For Newlyweds', icon: 'favorite', color: '#E91E63' },
    'دعاء المتزوج وشراء الدابة': { name: 'Marriage & Buying Animal', icon: 'pets', color: '#795548' },
    'الدعاء قبل إتيان الزوجة': { name: 'Before Intimacy', icon: 'favorite_border', color: '#E91E63' },
    'دعاء الغضب': { name: 'When Angry', icon: 'sentiment_very_dissatisfied', color: '#F44336' },
    'دعاء من رأى مبتلى': { name: 'Seeing Afflicted Person', icon: 'visibility', color: '#FF9800' },
    'ما يقال في المجلس': { name: 'In Gathering', icon: 'groups', color: '#9C27B0' },
    'كفارة المجلس': { name: 'Expiation of Gathering', icon: 'groups', color: '#9C27B0' },
    'الدعاء لمن قال غفر الله لك': { name: 'Response to Forgiveness Wish', icon: 'handshake', color: '#4CAF50' },
    'الدعاء لمن صنع إليك معروفاً': { name: 'For Someone Who Did Good', icon: 'volunteer_activism', color: '#4CAF50' },
    'ما يعصم الله به من الدجال': { name: 'Protection from Dajjal', icon: 'shield', color: '#F44336' },
    'الدعاء لمن قال إني أحبك في الله': { name: 'Response to Love Declaration', icon: 'favorite', color: '#E91E63' },
    'الدعاء لمن عرض عليك ماله': { name: 'When Offered Wealth', icon: 'payments', color: '#FFC107' },
    'الدعاء لمن أقرض عند القضاء': { name: 'Repaying Loan', icon: 'account_balance', color: '#4CAF50' },
    'دعاء الخوف من الشرك': { name: 'Fear of Shirk', icon: 'warning', color: '#F44336' },
    'الدعاء لمن قال بارك الله فيك': { name: 'Response to Barakah Wish', icon: 'handshake', color: '#4CAF50' },
    'دعاء كراهية الطيرة': { name: 'Against Bad Omens', icon: 'block', color: '#FF5722' },
    'دعاء الركوب': { name: 'Riding Vehicle', icon: 'directions_car', color: '#2196F3' },
    'دعاء السفر': { name: 'Traveling', icon: 'flight_takeoff', color: '#2196F3' },
    'دعاء دخول القرية أو البلدة': { name: 'Entering Town', icon: 'location_city', color: '#607D8B' },
    'دعاء دخول السوق': { name: 'Entering Market', icon: 'shopping_cart', color: '#FF9800' },
    'الدعاء إذا تعست الدابة': { name: 'When Animal Stumbles', icon: 'pets', color: '#795548' },
    'دعاء المسافر للمقيم': { name: 'Traveler for Resident', icon: 'flight_land', color: '#2196F3' },
    'دعاء المقيم للمسافر': { name: 'Resident for Traveler', icon: 'flight_takeoff', color: '#2196F3' },
    'التكبير والتسبيح في سير السفر': { name: 'Takbir While Traveling', icon: 'hiking', color: '#8BC34A' },
    'دعاء المسافر إذا أسحر': { name: 'Traveler at Dawn', icon: 'wb_twilight', color: '#FFA726' },
    'الدعاء إذا نزل مترلاً في سفر أو غيره': { name: 'Stopping at Place', icon: 'hotel', color: '#607D8B' },
    'ذكر الرجوع من السفر': { name: 'Returning from Travel', icon: 'flight_land', color: '#2196F3' },
    'ما يقول من أتاه أمر يسره أو يكرهه': { name: 'Good or Bad News', icon: 'info', color: '#2196F3' },
    'فضل الصلاة على النبي صلى الله عليه وسلم': { name: 'Virtue of Salawat', icon: 'favorite', color: '#E91E63' },
    'إفشاء السلام': { name: 'Spreading Salam', icon: 'waving_hand', color: '#4CAF50' },
    'كيف يرد السلام على الكافر إذا سلم': { name: 'Responding to Non-Muslim', icon: 'diversity_3', color: '#9E9E9E' },
    'الدعاء عند سماع صياح الديك ونهيق الحمار': { name: 'Hearing Rooster/Donkey', icon: 'pets', color: '#795548' },
    'دعاء نباح الكلاب بالليل': { name: 'Dogs Barking at Night', icon: 'pets', color: '#607D8B' },
    'الدعاء لمن سببته': { name: 'For Someone You Insulted', icon: 'healing', color: '#FF5722' },
    'ما يقول المسلم إذا مدح المسلم': { name: 'When Praised', icon: 'thumb_up', color: '#4CAF50' },
    'ما يقول المسلم إذا زكي': { name: 'When Commended', icon: 'star', color: '#FFC107' },
    'كيف يلبي المحرم في الحج أو العمرة': { name: 'Talbiyah for Hajj/Umrah', icon: 'mosque', color: '#8BC34A' },
    'التكبير إذا أتى الركن الأسود': { name: 'At Black Stone', icon: 'mosque', color: '#607D8B' },
    'الدعاء بين الركن اليماني والحجر الأسود': { name: 'Between Yemeni Corner & Black Stone', icon: 'mosque', color: '#607D8B' },
    'دعاء الوقوف على الصفا والمروة': { name: 'At Safa & Marwah', icon: 'hiking', color: '#8BC34A' },
    'الدعاء يوم عرفة': { name: 'Day of Arafah', icon: 'wb_sunny', color: '#FFA726' },
    'الذكر عند المشعر الحرام': { name: 'At Muzdalifah', icon: 'landscape', color: '#8BC34A' },
    'التكبير عند رمي الجمار مع كل حصاة': { name: 'Stoning Jamarat', icon: 'sports_baseball', color: '#795548' },
    'دعاء التعجب والأمر السار': { name: 'Amazement & Good News', icon: 'celebration', color: '#FFC107' },
    'ما يفعل من أتاه أمر يسره': { name: 'When Happy Event Occurs', icon: 'sentiment_satisfied', color: '#4CAF50' },
    'ما يقول من أحس وجعاً في جسده': { name: 'Feeling Pain', icon: 'healing', color: '#26A69A' },
    'دعاء من خشي أن يصيب شيئاً بعينه': { name: 'Fear of Evil Eye', icon: 'visibility', color: '#FF5722' },
    'ما يقال عند الفزع': { name: 'When Frightened', icon: 'warning', color: '#F44336' },
    'ما يقول عند الذبح أو النحر': { name: 'Slaughtering Animal', icon: 'restaurant', color: '#795548' },
    'ما يقول لرد كيد مردة الشياطين': { name: 'Against Evil Jinn', icon: 'shield', color: '#F44336' },
    'الاستغفار و التوبة': { name: 'Seeking Forgiveness', icon: 'healing', color: '#EF5350' },
    'فضل التسبيح والتحميد والتهليل والتكبير': { name: 'Virtue of Dhikr', icon: 'auto_awesome', color: '#FFC107' },
    'كيف كان النبي يسبح؟': { name: 'How Prophet Made Tasbih', icon: 'menu_book', color: '#AB47BC' },
    'من أنواع الخير والآداب الجامعة': { name: 'General Good Manners', icon: 'psychology', color: '#9C27B0' },
};

// Create structured output
const output = {
    metadata: {
        name: 'Hisn al-Muslim - Fortress of the Muslim',
        arabicName: 'حصن المسلم',
        author: 'Sa\'id bin Ali bin Wahf Al-Qahtani',
        arabicAuthor: 'سعيد بن علي بن وهف القحطاني',
        version: '1.0',
        totalCategories: arabicCategories.length,
        totalDuas: 0,
        source: 'https://github.com/rn0x/hisn_almuslim_json',
        lastUpdated: new Date().toISOString().split('T')[0]
    },
    categories: [],
    duas: []
};

let duaId = 1;
let categoryId = 1;

arabicCategories.forEach(arabicName => {
    const data = hisnData[arabicName];
    const texts = data.text || [];
    const footnotes = data.footnote || [];

    const mapping = categoryMapping[arabicName];
    const englishName = mapping?.name || arabicName;
    const icon = mapping?.icon || 'menu_book';
    const color = mapping?.color || '#9E9E9E';

    // Add category
    output.categories.push({
        id: categoryId,
        name: englishName,
        arabicName: arabicName,
        icon: icon,
        color: color,
        duaCount: texts.length
    });

    // Add duas for this category
    texts.forEach((text, index) => {
        output.duas.push({
            id: duaId++,
            categoryId: categoryId,
            arabic: text,
            reference: footnotes[index] || '',
            order: index + 1
        });
    });

    categoryId++;
});

output.metadata.totalDuas = output.duas.length;

// Save to file
const outputPath = path.join(dataDir, 'hisn-almuslim-structured.json');
fs.writeFileSync(outputPath, JSON.stringify(output, null, 2), 'utf8');

console.log(`\n✅ Successfully parsed Hisn al-Muslim!`);
console.log(`\n📊 Statistics:`);
console.log(`   Categories: ${output.categories.length}`);
console.log(`   Duas: ${output.duas.length}`);
console.log(`   Mapped: ${Object.keys(categoryMapping).length} categories`);
console.log(`   Unmapped: ${output.categories.length - Object.keys(categoryMapping).length} categories`);
console.log(`\n💾 Saved to: ${outputPath}`);

