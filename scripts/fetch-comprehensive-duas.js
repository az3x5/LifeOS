/**
 * Comprehensive Dua Fetcher
 * Fetches duas from multiple sources and combines them into a comprehensive collection
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create data directory if it doesn't exist
const dataDir = path.join(__dirname, '..', 'data', 'islamic');
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
}

// Comprehensive Dua Collection with 25+ categories and 200+ duas
const comprehensiveDuas = {
    "metadata": {
        "name": "Comprehensive Islamic Dua Collection",
        "description": "Extensive collection of authentic duas from Quran and Sunnah including Hisn al-Muslim",
        "version": "2.0",
        "total_categories": 25,
        "total_duas": 200,
        "last_updated": "2025-11-23",
        "sources": ["Hisn al-Muslim", "Quran", "Sahih Bukhari", "Sahih Muslim", "Abu Dawud", "Tirmidhi"]
    },
    "categories": [
        // Existing categories (1-15) from previous implementation
        {
            "id": 1,
            "name": "Morning & Evening Adhkar",
            "slug": "morning-evening",
            "icon": "wb_sunny",
            "color": "#FFA726",
            "description": "Daily remembrance for morning and evening protection"
        },
        {
            "id": 2,
            "name": "Salah & Worship",
            "slug": "salah-worship",
            "icon": "mosque",
            "color": "#66BB6A",
            "description": "Duas related to prayer and worship"
        },
        {
            "id": 3,
            "name": "Seeking Forgiveness",
            "slug": "forgiveness",
            "icon": "favorite",
            "color": "#EF5350",
            "description": "Istighfar and repentance duas"
        },
        {
            "id": 4,
            "name": "Protection & Safety",
            "slug": "protection",
            "icon": "shield",
            "color": "#42A5F5",
            "description": "Protection from harm and evil"
        },
        {
            "id": 5,
            "name": "Guidance & Knowledge",
            "slug": "guidance",
            "icon": "school",
            "color": "#AB47BC",
            "description": "Seeking wisdom and guidance"
        },
        {
            "id": 6,
            "name": "Health & Healing",
            "slug": "health",
            "icon": "healing",
            "color": "#26A69A",
            "description": "Duas for health and well-being"
        },
        {
            "id": 7,
            "name": "Provision & Sustenance",
            "slug": "provision",
            "icon": "payments",
            "color": "#FFCA28",
            "description": "Seeking halal provision and blessings"
        },
        {
            "id": 8,
            "name": "Family & Relationships",
            "slug": "family",
            "icon": "family_restroom",
            "color": "#FF7043",
            "description": "Duas for family and relationships"
        },
        {
            "id": 9,
            "name": "Travel & Journey",
            "slug": "travel",
            "icon": "flight",
            "color": "#5C6BC0",
            "description": "Duas for safe travel"
        },
        {
            "id": 10,
            "name": "Gratitude & Praise",
            "slug": "gratitude",
            "icon": "volunteer_activism",
            "color": "#EC407A",
            "description": "Thanking and praising Allah"
        },
        {
            "id": 11,
            "name": "Difficulty & Hardship",
            "slug": "difficulty",
            "icon": "support",
            "color": "#8D6E63",
            "description": "Duas during trials and hardship"
        },
        {
            "id": 12,
            "name": "Sleep & Waking",
            "slug": "sleep",
            "icon": "bedtime",
            "color": "#7E57C2",
            "description": "Bedtime and waking duas"
        },
        {
            "id": 13,
            "name": "Food & Drink",
            "slug": "food",
            "icon": "restaurant",
            "color": "#FF9800",
            "description": "Duas before and after eating"
        },
        {
            "id": 14,
            "name": "Quran Duas",
            "slug": "quran-duas",
            "icon": "menu_book",
            "color": "#00897B",
            "description": "Duas from the Holy Quran"
        },
        {
            "id": 15,
            "name": "Prophet's Duas",
            "slug": "prophets-duas",
            "icon": "star",
            "color": "#FFD700",
            "description": "Duas from Prophet Muhammad ﷺ"
        },
        // NEW CATEGORIES (16-25)
        {
            "id": 16,
            "name": "Entering & Leaving Home",
            "slug": "home",
            "icon": "home",
            "color": "#9C27B0",
            "description": "Duas when entering and leaving home"
        },
        {
            "id": 17,
            "name": "Wudu & Cleanliness",
            "slug": "wudu",
            "icon": "water_drop",
            "color": "#03A9F4",
            "description": "Duas related to wudu and cleanliness"
        },
        {
            "id": 18,
            "name": "Mosque & Masjid",
            "slug": "mosque",
            "icon": "account_balance",
            "color": "#4CAF50",
            "description": "Duas for entering and leaving mosque"
        },
        {
            "id": 19,
            "name": "Weather & Nature",
            "slug": "weather",
            "icon": "cloud",
            "color": "#607D8B",
            "description": "Duas for rain, wind, thunder"
        },
        {
            "id": 20,
            "name": "Death & Funeral",
            "slug": "death",
            "icon": "local_florist",
            "color": "#795548",
            "description": "Duas for the deceased and condolence"
        },
        {
            "id": 21,
            "name": "Marriage & Children",
            "slug": "marriage",
            "icon": "favorite_border",
            "color": "#E91E63",
            "description": "Duas for marriage and children"
        },
        {
            "id": 22,
            "name": "Anger & Patience",
            "slug": "anger",
            "icon": "self_improvement",
            "color": "#FF5722",
            "description": "Duas to control anger and gain patience"
        },
        {
            "id": 23,
            "name": "Debt & Financial Worry",
            "slug": "debt",
            "icon": "account_balance_wallet",
            "color": "#009688",
            "description": "Duas for relief from debt"
        },
        {
            "id": 24,
            "name": "Hajj & Umrah",
            "slug": "hajj",
            "icon": "place",
            "color": "#3F51B5",
            "description": "Duas for pilgrimage"
        },
        {
            "id": 25,
            "name": "General Supplications",
            "slug": "general",
            "icon": "auto_awesome",
            "color": "#FFC107",
            "description": "Comprehensive general duas"
        }
    ],
    "duas": []
};

console.log('🚀 Starting comprehensive dua collection...\n');
console.log('📦 Creating comprehensive dua database with 25 categories...\n');

// Load existing duas from duas-enhanced.json (but we'll replace category 1 with complete adhkar)
const existingDuasPath = path.join(dataDir, 'duas-enhanced.json');
let existingDuas = [];
if (fs.existsSync(existingDuasPath)) {
    const existingData = JSON.parse(fs.readFileSync(existingDuasPath, 'utf8'));
    existingDuas = existingData.duas || [];
    // Remove category 1 duas (Morning & Evening) - we'll add complete collection
    existingDuas = existingDuas.filter(dua => dua.categoryId !== 1);
    console.log(`✅ Loaded ${existingDuas.length} existing duas (excluding category 1)\n`);
}

// ============================================
// COMPLETE MORNING & EVENING ADHKAR
// ============================================

// Category 1: Morning & Evening Adhkar - COMPLETE COLLECTION (10 essential adhkar)
const morningEveningAdhkar = [
    {
        "id": 1,
        "categoryId": 1,
        "title": "Ayatul Kursi",
        "arabic": "اللَّهُ لَا إِلَٰهَ إِلَّا هُوَ الْحَيُّ الْقَيُّومُ ۚ لَا تَأْخُذُهُ سِنَةٌ وَلَا نَوْمٌ ۚ لَهُ مَا فِي السَّمَاوَاتِ وَمَا فِي الْأَرْضِ ۗ مَنْ ذَا الَّذِي يَشْفَعُ عِنْدَهُ إِلَّا بِإِذْنِهِ ۚ يَعْلَمُ مَا بَيْنَ أَيْدِيهِمْ وَمَا خَلْفَهُمْ ۖ وَلَا يُحِيطُونَ بِشَيْءٍ مِنْ عِلْمِهِ إِلَّا بِمَا شَاءَ ۚ وَسِعَ كُرْسِيُّهُ السَّمَاوَاتِ وَالْأَرْضَ ۖ وَلَا يَئُودُهُ حِفْظُهُمَا ۚ وَهُوَ الْعَلِيُّ الْعَظِيمُ",
        "transliteration": "Allahu la ilaha illa Huwa, Al-Hayyul-Qayyum. La ta'khudhuhu sinatun wa la nawm. Lahu ma fis-samawati wa ma fil-ard. Man dhal-ladhi yashfa'u 'indahu illa bi-idhnih. Ya'lamu ma bayna aydihim wa ma khalfahum, wa la yuhituna bi shay'im-min 'ilmihi illa bima sha'a. Wasi'a Kursiyyuhus-samawati wal-ard, wa la ya'uduhu hifdhuhuma. Wa Huwal-'Aliyyul-'Adheem.",
        "translation": "Allah! There is no deity except Him, the Ever-Living, the Sustainer of existence. Neither drowsiness overtakes Him nor sleep. To Him belongs whatever is in the heavens and whatever is on the earth. Who is it that can intercede with Him except by His permission? He knows what is before them and what will be after them, and they encompass not a thing of His knowledge except for what He wills. His Kursi extends over the heavens and the earth, and their preservation tires Him not. And He is the Most High, the Most Great.",
        "reference": "Quran 2:255",
        "benefits": "Whoever recites this when he rises in the morning will be protected from jinn until he retires in the evening, and whoever recites it when he retires in the evening will be protected from them until he rises in the morning",
        "time": "Morning & Evening (once)"
    },
    {
        "id": 2,
        "categoryId": 1,
        "title": "Last Two Verses of Surah Al-Baqarah",
        "arabic": "آمَنَ الرَّسُولُ بِمَا أُنزِلَ إِلَيْهِ مِن رَّبِّهِ وَالْمُؤْمِنُونَ ۚ كُلٌّ آمَنَ بِاللَّهِ وَمَلَائِكَتِهِ وَكُتُبِهِ وَرُسُلِهِ لَا نُفَرِّقُ بَيْنَ أَحَدٍ مِّن رُّسُلِهِ ۚ وَقَالُوا سَمِعْنَا وَأَطَعْنَا ۖ غُفْرَانَكَ رَبَّنَا وَإِلَيْكَ الْمَصِيرُ. لَا يُكَلِّفُ اللَّهُ نَفْسًا إِلَّا وُسْعَهَا ۚ لَهَا مَا كَسَبَتْ وَعَلَيْهَا مَا اكْتَسَبَتْ ۗ رَبَّنَا لَا تُؤَاخِذْنَا إِن نَّسِينَا أَوْ أَخْطَأْنَا ۚ رَبَّنَا وَلَا تَحْمِلْ عَلَيْنَا إِصْرًا كَمَا حَمَلْتَهُ عَلَى الَّذِينَ مِن قَبْلِنَا ۚ رَبَّنَا وَلَا تُحَمِّلْنَا مَا لَا طَاقَةَ لَنَا بِهِ ۖ وَاعْفُ عَنَّا وَاغْفِرْ لَنَا وَارْحَمْنَا ۚ أَنتَ مَوْلَانَا فَانصُرْنَا عَلَى الْقَوْمِ الْكَافِرِينَ",
        "transliteration": "Amana ar-Rasulu bima unzila ilayhi min Rabbihi wal-mu'minun. Kullun amana billahi wa mala'ikatihi wa kutubihi wa Rusulihi la nufarriqu bayna ahadin min Rusulihi wa qalu sami'na wa ata'na ghufranaka Rabbana wa ilaykal-masir. La yukallifu Allahu nafsan illa wus'aha laha ma kasabat wa 'alayha mak-tasabat. Rabbana la tu'akhidhna in nasina aw akhta'na. Rabbana wa la tahmil 'alayna isran kama hamaltahu 'ala alladhina min qablina. Rabbana wa la tuhammilna ma la taqata lana bihi wa'fu 'anna waghfir lana warhamna anta mawlana fansurna 'alal-qawmil-kafirin.",
        "translation": "The Messenger has believed in what was revealed to him from his Lord, and [so have] the believers. All of them have believed in Allah and His angels and His books and His messengers, [saying], 'We make no distinction between any of His messengers.' And they say, 'We hear and we obey. [We seek] Your forgiveness, our Lord, and to You is the [final] destination.' Allah does not charge a soul except [with that within] its capacity. It will have [the consequence of] what [good] it has gained, and it will bear [the consequence of] what [evil] it has earned. 'Our Lord, do not impose blame upon us if we have forgotten or erred. Our Lord, and lay not upon us a burden like that which You laid upon those before us. Our Lord, and burden us not with that which we have no ability to bear. And pardon us; and forgive us; and have mercy upon us. You are our protector, so give us victory over the disbelieving people.'",
        "reference": "Quran 2:285-286",
        "benefits": "Whoever recites these two verses at night, they will be sufficient for him",
        "time": "Evening (once)"
    },
    {
        "id": 3,
        "categoryId": 1,
        "title": "Surah Al-Ikhlas",
        "arabic": "قُلْ هُوَ اللَّهُ أَحَدٌ، اللَّهُ الصَّمَدُ، لَمْ يَلِدْ وَلَمْ يُولَدْ، وَلَمْ يَكُن لَّهُ كُفُوًا أَحَدٌ",
        "transliteration": "Qul Huwa Allahu Ahad, Allahu as-Samad, lam yalid wa lam yulad, wa lam yakun lahu kufuwan ahad.",
        "translation": "Say: He is Allah, the One. Allah, the Eternal Refuge. He neither begets nor is born, nor is there to Him any equivalent.",
        "reference": "Quran 112:1-4",
        "benefits": "Equivalent to one-third of the Quran. Protection from all evil",
        "time": "Morning & Evening (3 times)"
    },
    {
        "id": 4,
        "categoryId": 1,
        "title": "Surah Al-Falaq",
        "arabic": "قُلْ أَعُوذُ بِرَبِّ الْفَلَقِ، مِن شَرِّ مَا خَلَقَ، وَمِن شَرِّ غَاسِقٍ إِذَا وَقَبَ، وَمِن شَرِّ النَّفَّاثَاتِ فِي الْعُقَدِ، وَمِن شَرِّ حَاسِدٍ إِذَا حَسَدَ",
        "transliteration": "Qul a'udhu bi-Rabbi al-Falaq, min sharri ma khalaq, wa min sharri ghasiqin idha waqab, wa min sharri an-naffathati fil-'uqad, wa min sharri hasidin idha hasad.",
        "translation": "Say: I seek refuge in the Lord of daybreak, from the evil of that which He created, and from the evil of darkness when it settles, and from the evil of the blowers in knots, and from the evil of an envier when he envies.",
        "reference": "Quran 113:1-5",
        "benefits": "Complete protection from all types of evil and harm",
        "time": "Morning & Evening (3 times)"
    },
    {
        "id": 5,
        "categoryId": 1,
        "title": "Surah An-Nas",
        "arabic": "قُلْ أَعُوذُ بِرَبِّ النَّاسِ، مَلِكِ النَّاسِ، إِلَٰهِ النَّاسِ، مِن شَرِّ الْوَسْوَاسِ الْخَنَّاسِ، الَّذِي يُوَسْوِسُ فِي صُدُورِ النَّاسِ، مِنَ الْجِنَّةِ وَالنَّاسِ",
        "transliteration": "Qul a'udhu bi-Rabbi an-Nas, Maliki an-Nas, Ilahi an-Nas, min sharri al-waswasi al-khannas, alladhi yuwaswisu fi suduri an-nas, min al-jinnati wan-nas.",
        "translation": "Say: I seek refuge in the Lord of mankind, the Sovereign of mankind, the God of mankind, from the evil of the retreating whisperer, who whispers [evil] into the breasts of mankind, from among the jinn and mankind.",
        "reference": "Quran 114:1-6",
        "benefits": "Protection from evil whispers of Shaytan and evil jinn",
        "time": "Morning & Evening (3 times)"
    },
    {
        "id": 6,
        "categoryId": 1,
        "title": "Morning Tasbih",
        "arabic": "سُبْحَانَ اللَّهِ وَبِحَمْدِهِ",
        "transliteration": "Subhan Allahi wa bihamdihi",
        "translation": "Glory is to Allah and praise is to Him",
        "reference": "Bukhari 6406, Muslim 2691",
        "benefits": "Whoever says this 100 times in the morning and evening, none will bring better than this except one who says the same or does more",
        "time": "Morning & Evening (100 times)"
    },
    {
        "id": 7,
        "categoryId": 1,
        "title": "The Master of Seeking Forgiveness (Sayyid al-Istighfar)",
        "arabic": "اللَّهُمَّ أَنْتَ رَبِّي لَا إِلَٰهَ إِلَّا أَنْتَ، خَلَقْتَنِي وَأَنَا عَبْدُكَ، وَأَنَا عَلَىٰ عَهْدِكَ وَوَعْدِكَ مَا اسْتَطَعْتُ، أَعُوذُ بِكَ مِنْ شَرِّ مَا صَنَعْتُ، أَبُوءُ لَكَ بِنِعْمَتِكَ عَلَيَّ، وَأَبُوءُ بِذَنْبِي فَاغْفِرْ لِي، فَإِنَّهُ لَا يَغْفِرُ الذُّنُوبَ إِلَّا أَنْتَ",
        "transliteration": "Allahumma anta Rabbi la ilaha illa anta, khalaqtani wa ana 'abduka, wa ana 'ala 'ahdika wa wa'dika mastata'tu, a'udhu bika min sharri ma sana'tu, abu'u laka bini'matika 'alayya, wa abu'u bidhanbi faghfir li, fa innahu la yaghfiru adh-dhunuba illa anta.",
        "translation": "O Allah, You are my Lord, there is no deity except You. You created me and I am Your servant, and I am faithful to my covenant and my promise as much as I can. I seek refuge in You from the evil of what I have done. I acknowledge Your favor upon me and I acknowledge my sin, so forgive me, for verily none can forgive sins except You.",
        "reference": "Bukhari 6306",
        "benefits": "Whoever says this with firm conviction in the evening and dies that night will enter Paradise, and whoever says it in the morning with firm conviction and dies that day will enter Paradise",
        "time": "Morning & Evening (once)"
    },
    {
        "id": 8,
        "categoryId": 1,
        "title": "Morning Protection Dua",
        "arabic": "أَصْبَحْنَا وَأَصْبَحَ الْمُلْكُ لِلَّهِ، وَالْحَمْدُ لِلَّهِ، لَا إِلَٰهَ إِلَّا اللَّهُ وَحْدَهُ لَا شَرِيكَ لَهُ، لَهُ الْمُلْكُ وَلَهُ الْحَمْدُ وَهُوَ عَلَىٰ كُلِّ شَيْءٍ قَدِيرٌ، رَبِّ أَسْأَلُكَ خَيْرَ مَا فِي هَٰذَا الْيَوْمِ وَخَيْرَ مَا بَعْدَهُ، وَأَعُوذُ بِكَ مِنْ شَرِّ مَا فِي هَٰذَا الْيَوْمِ وَشَرِّ مَا بَعْدَهُ، رَبِّ أَعُوذُ بِكَ مِنَ الْكَسَلِ وَسُوءِ الْكِبَرِ، رَبِّ أَعُوذُ بِكَ مِنْ عَذَابٍ فِي النَّارِ وَعَذَابٍ فِي الْقَبْرِ",
        "transliteration": "Asbahna wa asbahal-mulku lillah, walhamdu lillah, la ilaha illallahu wahdahu la sharika lah, lahul-mulku wa lahul-hamd, wa Huwa 'ala kulli shay'in Qadir. Rabbi as'aluka khayra ma fi hadhal-yawm, wa khayra ma ba'dah, wa a'udhu bika min sharri ma fi hadhal-yawm, wa sharri ma ba'dah. Rabbi a'udhu bika minal-kasal, wa su'il-kibar. Rabbi a'udhu bika min 'adhabin fin-nar, wa 'adhabin fil-qabr.",
        "translation": "We have entered a new day and with it all dominion is Allah's. Praise is to Allah. None has the right to be worshipped but Allah alone, Who has no partner. To Allah belongs the dominion, and to Him is the praise, and He is Able to do all things. My Lord, I ask You for the goodness of this day and the goodness that follows it, and I seek refuge in You from the evil of this day and the evil that follows it. My Lord, I seek refuge in You from laziness and helpless old age. My Lord, I seek refuge in You from the punishment of the Fire and the punishment of the grave.",
        "reference": "Muslim 2723",
        "benefits": "Comprehensive morning protection from all evil",
        "time": "Morning (once)"
    },
    {
        "id": 9,
        "categoryId": 1,
        "title": "Evening Protection Dua",
        "arabic": "أَمْسَيْنَا وَأَمْسَى الْمُلْكُ لِلَّهِ، وَالْحَمْدُ لِلَّهِ، لَا إِلَٰهَ إِلَّا اللَّهُ وَحْدَهُ لَا شَرِيكَ لَهُ، لَهُ الْمُلْكُ وَلَهُ الْحَمْدُ وَهُوَ عَلَىٰ كُلِّ شَيْءٍ قَدِيرٌ، رَبِّ أَسْأَلُكَ خَيْرَ مَا فِي هَٰذِهِ اللَّيْلَةِ وَخَيْرَ مَا بَعْدَهَا، وَأَعُوذُ بِكَ مِنْ شَرِّ مَا فِي هَٰذِهِ اللَّيْلَةِ وَشَرِّ مَا بَعْدَهَا، رَبِّ أَعُوذُ بِكَ مِنَ الْكَسَلِ وَسُوءِ الْكِبَرِ، رَبِّ أَعُوذُ بِكَ مِنْ عَذَابٍ فِي النَّارِ وَعَذَابٍ فِي الْقَبْرِ",
        "transliteration": "Amsayna wa amsal-mulku lillah, walhamdu lillah, la ilaha illallahu wahdahu la sharika lah, lahul-mulku wa lahul-hamd, wa Huwa 'ala kulli shay'in Qadir. Rabbi as'aluka khayra ma fi hadhihil-laylah, wa khayra ma ba'daha, wa a'udhu bika min sharri ma fi hadhihil-laylah, wa sharri ma ba'daha. Rabbi a'udhu bika minal-kasal, wa su'il-kibar. Rabbi a'udhu bika min 'adhabin fin-nar, wa 'adhabin fil-qabr.",
        "translation": "We have entered the evening and with it all dominion is Allah's. Praise is to Allah. None has the right to be worshipped but Allah alone, Who has no partner. To Allah belongs the dominion, and to Him is the praise, and He is Able to do all things. My Lord, I ask You for the goodness of this night and the goodness that follows it, and I seek refuge in You from the evil of this night and the evil that follows it. My Lord, I seek refuge in You from laziness and helpless old age. My Lord, I seek refuge in You from the punishment of the Fire and the punishment of the grave.",
        "reference": "Muslim 2723",
        "benefits": "Comprehensive evening protection from all evil",
        "time": "Evening (once)"
    },
    {
        "id": 10,
        "categoryId": 1,
        "title": "Seeking Allah's Pleasure",
        "arabic": "رَضِيتُ بِاللَّهِ رَبًّا، وَبِالْإِسْلَامِ دِينًا، وَبِمُحَمَّدٍ صَلَّى اللَّهُ عَلَيْهِ وَسَلَّمَ نَبِيًّا",
        "transliteration": "Raditu billahi Rabban, wa bil-Islami dinan, wa bi-Muhammadin (sallallahu 'alayhi wa sallam) nabiyyan.",
        "translation": "I am pleased with Allah as my Lord, with Islam as my religion, and with Muhammad (peace be upon him) as my Prophet.",
        "reference": "Abu Dawud 1529, Tirmidhi 3389",
        "benefits": "Paradise becomes obligatory for whoever says this",
        "time": "Morning & Evening (3 times)"
    }
];

// Add morning/evening adhkar first
comprehensiveDuas.duas.push(...morningEveningAdhkar);

// Add existing duas from categories 2-15
comprehensiveDuas.duas.push(...existingDuas);

// NEW DUAS - Category 16: Entering & Leaving Home
const homeDuas = [
    {
        "id": comprehensiveDuas.duas.length + 1,
        "categoryId": 16,
        "title": "Dua When Entering Home",
        "arabic": "بِسْمِ اللَّهِ وَلَجْنَا، وَبِسْمِ اللَّهِ خَرَجْنَا، وَعَلَى اللَّهِ رَبِّنَا تَوَكَّلْنَا",
        "transliteration": "Bismillahi walajna, wa bismillahi kharajna, wa 'ala Allahi rabbina tawakkalna",
        "translation": "In the name of Allah we enter, in the name of Allah we leave, and upon Allah our Lord we depend",
        "reference": "Abu Dawud 5096",
        "benefits": "Protection for the home and family, blessings upon entering",
        "time": "When entering home"
    },
    {
        "id": comprehensiveDuas.duas.length + 2,
        "categoryId": 16,
        "title": "Dua When Leaving Home",
        "arabic": "بِسْمِ اللَّهِ، تَوَكَّلْتُ عَلَى اللَّهِ، وَلَا حَوْلَ وَلَا قُوَّةَ إِلَّا بِاللَّهِ",
        "transliteration": "Bismillah, tawakkaltu 'ala Allah, wa la hawla wa la quwwata illa billah",
        "translation": "In the name of Allah, I place my trust in Allah, and there is no might nor power except with Allah",
        "reference": "Abu Dawud 5095, Tirmidhi 3426",
        "benefits": "Protection from harm, guidance, and sufficiency",
        "time": "When leaving home"
    }
];

// Category 17: Wudu & Cleanliness
const wuduDuas = [
    {
        "id": comprehensiveDuas.duas.length + 3,
        "categoryId": 17,
        "title": "Dua Before Wudu",
        "arabic": "بِسْمِ اللَّهِ",
        "transliteration": "Bismillah",
        "translation": "In the name of Allah",
        "reference": "Abu Dawud 101, Ibn Majah 397",
        "benefits": "Wudu is not complete without saying Bismillah",
        "time": "Before starting wudu"
    },
    {
        "id": comprehensiveDuas.duas.length + 4,
        "categoryId": 17,
        "title": "Dua After Wudu",
        "arabic": "أَشْهَدُ أَنْ لَا إِلَهَ إِلَّا اللَّهُ وَحْدَهُ لَا شَرِيكَ لَهُ، وَأَشْهَدُ أَنَّ مُحَمَّدًا عَبْدُهُ وَرَسُولُهُ",
        "transliteration": "Ashhadu an la ilaha illa Allah wahdahu la sharika lah, wa ashhadu anna Muhammadan 'abduhu wa rasuluh",
        "translation": "I bear witness that there is no deity except Allah alone, without partner, and I bear witness that Muhammad is His slave and Messenger",
        "reference": "Muslim 234",
        "benefits": "The gates of Paradise are opened for the one who says this",
        "time": "After completing wudu"
    },
    {
        "id": comprehensiveDuas.duas.length + 5,
        "categoryId": 17,
        "title": "Dua When Entering Toilet",
        "arabic": "اللَّهُمَّ إِنِّي أَعُوذُ بِكَ مِنَ الْخُبُثِ وَالْخَبَائِثِ",
        "transliteration": "Allahumma inni a'udhu bika min al-khubthi wal-khaba'ith",
        "translation": "O Allah, I seek refuge in You from male and female evil spirits",
        "reference": "Bukhari 142, Muslim 375",
        "benefits": "Protection from shaytan in the toilet",
        "time": "Before entering toilet"
    },
    {
        "id": comprehensiveDuas.duas.length + 6,
        "categoryId": 17,
        "title": "Dua When Leaving Toilet",
        "arabic": "غُفْرَانَكَ",
        "transliteration": "Ghufranaka",
        "translation": "I seek Your forgiveness",
        "reference": "Abu Dawud 30, Tirmidhi 7, Ibn Majah 300",
        "benefits": "Seeking Allah's forgiveness after relieving oneself",
        "time": "After leaving toilet"
    }
];

// Category 18: Mosque & Masjid
const mosqueDuas = [
    {
        "id": comprehensiveDuas.duas.length + 7,
        "categoryId": 18,
        "title": "Dua When Entering Mosque",
        "arabic": "أَعُوذُ بِاللَّهِ الْعَظِيمِ، وَبِوَجْهِهِ الْكَرِيمِ، وَسُلْطَانِهِ الْقَدِيمِ، مِنَ الشَّيْطَانِ الرَّجِيمِ",
        "transliteration": "A'udhu billahil-'Adhim, wa bi-Wajhihil-Karim, wa Sultanihil-Qadim, min ash-Shaytanir-Rajim",
        "translation": "I seek refuge in Allah the Almighty, in His Noble Face, and His Eternal Dominion, from Satan the accursed",
        "reference": "Abu Dawud 466",
        "benefits": "Protection from Shaytan when entering the mosque",
        "time": "When entering mosque"
    },
    {
        "id": comprehensiveDuas.duas.length + 8,
        "categoryId": 18,
        "title": "Dua When Leaving Mosque",
        "arabic": "اللَّهُمَّ إِنِّي أَسْأَلُكَ مِنْ فَضْلِكَ",
        "transliteration": "Allahumma inni as'aluka min fadlik",
        "translation": "O Allah, I ask You from Your bounty",
        "reference": "Muslim 713",
        "benefits": "Asking for Allah's bounty and blessings",
        "time": "When leaving mosque"
    }
];

// Category 19: Weather & Nature
const weatherDuas = [
    {
        "id": comprehensiveDuas.duas.length + 9,
        "categoryId": 19,
        "title": "Dua When It Rains",
        "arabic": "اللَّهُمَّ صَيِّبًا نَافِعًا",
        "transliteration": "Allahumma sayyiban nafi'a",
        "translation": "O Allah, (bring) beneficial rain",
        "reference": "Bukhari 1032",
        "benefits": "Asking for beneficial rain",
        "time": "When it rains"
    },
    {
        "id": comprehensiveDuas.duas.length + 10,
        "categoryId": 19,
        "title": "Dua When Hearing Thunder",
        "arabic": "سُبْحَانَ الَّذِي يُسَبِّحُ الرَّعْدُ بِحَمْدِهِ وَالْمَلَائِكَةُ مِنْ خِيفَتِهِ",
        "transliteration": "Subhana alladhi yusabbihur-ra'du bihamdihi wal-mala'ikatu min khifatih",
        "translation": "Glory is to Him Whom thunder glorifies with His praise, and the angels too, out of fear of Him",
        "reference": "Muwatta Malik 3641",
        "benefits": "Protection from being struck by lightning",
        "time": "When hearing thunder"
    },
    {
        "id": comprehensiveDuas.duas.length + 11,
        "categoryId": 19,
        "title": "Dua When Seeing New Moon",
        "arabic": "اللَّهُ أَكْبَرُ، اللَّهُمَّ أَهِلَّهُ عَلَيْنَا بِالْأَمْنِ وَالْإِيمَانِ، وَالسَّلَامَةِ وَالْإِسْلَامِ، رَبِّي وَرَبُّكَ اللَّهُ",
        "transliteration": "Allahu Akbar, Allahumma ahillahu 'alayna bil-amni wal-iman, was-salamati wal-Islam, rabbi wa rabbuka Allah",
        "translation": "Allah is the Greatest. O Allah, bring it over us with blessing and faith, and security and Islam. My Lord and your Lord is Allah",
        "reference": "Tirmidhi 3451",
        "benefits": "Blessings for the new month",
        "time": "When seeing new moon"
    }
];

// Category 20: Death & Funeral
const deathDuas = [
    {
        "id": comprehensiveDuas.duas.length + 12,
        "categoryId": 20,
        "title": "Dua for the Deceased",
        "arabic": "اللَّهُمَّ اغْفِرْ لَهُ وَارْحَمْهُ، وَعَافِهِ وَاعْفُ عَنْهُ",
        "transliteration": "Allahumma ighfir lahu warhamhu, wa 'afihi wa'fu 'anhu",
        "translation": "O Allah, forgive him and have mercy on him, and give him strength and pardon him",
        "reference": "Muslim 963",
        "benefits": "Mercy and forgiveness for the deceased",
        "time": "When praying for deceased"
    },
    {
        "id": comprehensiveDuas.duas.length + 13,
        "categoryId": 20,
        "title": "Dua When Visiting Graves",
        "arabic": "السَّلَامُ عَلَيْكُمْ أَهْلَ الدِّيَارِ مِنَ الْمُؤْمِنِينَ وَالْمُسْلِمِينَ، وَإِنَّا إِنْ شَاءَ اللَّهُ بِكُمْ لَاحِقُونَ، نَسْأَلُ اللَّهَ لَنَا وَلَكُمُ الْعَافِيَةَ",
        "transliteration": "As-salamu 'alaykum ahla ad-diyari min al-mu'minina wal-muslimin, wa inna in sha' Allah bikum lahiqun, nas'alu Allaha lana wa lakum al-'afiyah",
        "translation": "Peace be upon you, O inhabitants of the dwellings, from among the believers and Muslims. Indeed, we will, if Allah wills, join you. We ask Allah for well-being for us and for you",
        "reference": "Muslim 974",
        "benefits": "Respect for the deceased and supplication for them",
        "time": "When visiting graves"
    }
];

// Category 21: Marriage & Children
const marriageDuas = [
    {
        "id": comprehensiveDuas.duas.length + 14,
        "categoryId": 21,
        "title": "Dua for Newlyweds",
        "arabic": "بَارَكَ اللَّهُ لَكَ، وَبَارَكَ عَلَيْكَ، وَجَمَعَ بَيْنَكُمَا فِي خَيْرٍ",
        "transliteration": "Baraka Allahu laka, wa baraka 'alayka, wa jama'a baynakuma fi khayr",
        "translation": "May Allah bless you, and shower His blessings upon you, and join you together in goodness",
        "reference": "Abu Dawud 2130, Tirmidhi 1091",
        "benefits": "Blessings for the married couple",
        "time": "Congratulating newlyweds"
    },
    {
        "id": comprehensiveDuas.duas.length + 15,
        "categoryId": 21,
        "title": "Dua Before Intimacy",
        "arabic": "بِسْمِ اللَّهِ، اللَّهُمَّ جَنِّبْنَا الشَّيْطَانَ، وَجَنِّبِ الشَّيْطَانَ مَا رَزَقْتَنَا",
        "transliteration": "Bismillah, Allahumma jannibna ash-Shaytan, wa jannib ash-Shaytana ma razaqtana",
        "translation": "In the name of Allah. O Allah, keep us away from Satan and keep Satan away from what You have bestowed upon us",
        "reference": "Bukhari 141, Muslim 1434",
        "benefits": "Protection for future children from Satan",
        "time": "Before intimacy"
    },
    {
        "id": comprehensiveDuas.duas.length + 16,
        "categoryId": 21,
        "title": "Dua for Righteous Offspring",
        "arabic": "رَبِّ هَبْ لِي مِن لَّدُنكَ ذُرِّيَّةً طَيِّبَةً ۖ إِنَّكَ سَمِيعُ الدُّعَاءِ",
        "transliteration": "Rabbi hab li min ladunka dhurriyyatan tayyibatan innaka sami'u ad-du'a",
        "translation": "My Lord, grant me from Yourself a good offspring. Indeed, You are the Hearer of supplication",
        "reference": "Quran 3:38",
        "benefits": "Asking for righteous children",
        "time": "Anytime"
    }
];

// Category 22: Anger & Patience
const angerDuas = [
    {
        "id": comprehensiveDuas.duas.length + 17,
        "categoryId": 22,
        "title": "Dua When Angry",
        "arabic": "أَعُوذُ بِاللَّهِ مِنَ الشَّيْطَانِ الرَّجِيمِ",
        "transliteration": "A'udhu billahi min ash-Shaytanir-Rajim",
        "translation": "I seek refuge in Allah from Satan the accursed",
        "reference": "Bukhari 3282, Muslim 2610",
        "benefits": "Calming anger and seeking protection from Satan",
        "time": "When feeling angry"
    },
    {
        "id": comprehensiveDuas.duas.length + 18,
        "categoryId": 22,
        "title": "Dua for Patience",
        "arabic": "رَبَّنَا أَفْرِغْ عَلَيْنَا صَبْرًا وَثَبِّتْ أَقْدَامَنَا",
        "transliteration": "Rabbana afrigh 'alayna sabran wa thabbit aqdamana",
        "translation": "Our Lord, pour upon us patience and plant firmly our feet",
        "reference": "Quran 2:250",
        "benefits": "Asking for patience and steadfastness",
        "time": "During trials"
    }
];

// Category 23: Debt & Financial Worry
const debtDuas = [
    {
        "id": comprehensiveDuas.duas.length + 19,
        "categoryId": 23,
        "title": "Dua for Relief from Debt",
        "arabic": "اللَّهُمَّ اكْفِنِي بِحَلَالِكَ عَنْ حَرَامِكَ، وَأَغْنِنِي بِفَضْلِكَ عَمَّنْ سِوَاكَ",
        "transliteration": "Allahumma ikfini bihalalika 'an haramika, wa aghnini bifadlika 'amman siwak",
        "translation": "O Allah, make what is lawful enough for me, as opposed to what is unlawful, and spare me by Your grace, of need of others",
        "reference": "Tirmidhi 3563",
        "benefits": "Relief from debt and financial worry",
        "time": "When in debt"
    },
    {
        "id": comprehensiveDuas.duas.length + 20,
        "categoryId": 23,
        "title": "Dua for Anxiety and Worry",
        "arabic": "اللَّهُمَّ إِنِّي أَعُوذُ بِكَ مِنَ الْهَمِّ وَالْحَزَنِ، وَالْعَجْزِ وَالْكَسَلِ، وَالْبُخْلِ وَالْجُبْنِ، وَضَلَعِ الدَّيْنِ، وَغَلَبَةِ الرِّجَالِ",
        "transliteration": "Allahumma inni a'udhu bika min al-hammi wal-hazan, wal-'ajzi wal-kasal, wal-bukhli wal-jubn, wa dala'i ad-dayn, wa ghalabati ar-rijal",
        "translation": "O Allah, I seek refuge in You from worry and grief, from helplessness and laziness, from cowardice and miserliness, and from being overcome by debt and overpowered by men",
        "reference": "Bukhari 6369",
        "benefits": "Protection from anxiety, debt, and being overpowered",
        "time": "When worried or anxious"
    }
];

// Category 24: Hajj & Umrah
const hajjDuas = [
    {
        "id": comprehensiveDuas.duas.length + 21,
        "categoryId": 24,
        "title": "Talbiyah - Hajj Chant",
        "arabic": "لَبَّيْكَ اللَّهُمَّ لَبَّيْكَ، لَبَّيْكَ لَا شَرِيكَ لَكَ لَبَّيْكَ، إِنَّ الْحَمْدَ وَالنِّعْمَةَ لَكَ وَالْمُلْكَ، لَا شَرِيكَ لَكَ",
        "transliteration": "Labbayka Allahumma labbayk, labbayka la sharika laka labbayk, inna al-hamda wan-ni'mata laka wal-mulk, la sharika lak",
        "translation": "Here I am, O Allah, here I am. Here I am, You have no partner, here I am. Verily all praise, grace and sovereignty belong to You. You have no partner",
        "reference": "Bukhari 1549, Muslim 1184",
        "benefits": "The chant of pilgrims during Hajj and Umrah",
        "time": "During Hajj/Umrah"
    },
    {
        "id": comprehensiveDuas.duas.length + 22,
        "categoryId": 24,
        "title": "Dua at Safa and Marwah",
        "arabic": "لَا إِلَهَ إِلَّا اللَّهُ وَحْدَهُ لَا شَرِيكَ لَهُ، لَهُ الْمُلْكُ وَلَهُ الْحَمْدُ وَهُوَ عَلَى كُلِّ شَيْءٍ قَدِيرٌ، لَا إِلَهَ إِلَّا اللَّهُ وَحْدَهُ، أَنْجَزَ وَعْدَهُ، وَنَصَرَ عَبْدَهُ، وَهَزَمَ الْأَحْزَابَ وَحْدَهُ",
        "transliteration": "La ilaha illa Allah wahdahu la sharika lah, lahu al-mulku wa lahu al-hamd, wa huwa 'ala kulli shay'in qadir. La ilaha illa Allah wahdah, anjaza wa'dah, wa nasara 'abdah, wa hazama al-ahzaba wahdah",
        "translation": "There is no deity except Allah, alone, without partner. To Him belongs dominion and to Him belongs praise, and He is over all things competent. There is no deity except Allah alone. He fulfilled His promise, supported His servant, and defeated the confederates alone",
        "reference": "Muslim 1218",
        "benefits": "Dua at Safa and Marwah during Sa'i",
        "time": "At Safa and Marwah"
    }
];

// Category 25: General Supplications
const generalDuas = [
    {
        "id": comprehensiveDuas.duas.length + 23,
        "categoryId": 25,
        "title": "Dua for Good in This World and Hereafter",
        "arabic": "رَبَّنَا آتِنَا فِي الدُّنْيَا حَسَنَةً وَفِي الْآخِرَةِ حَسَنَةً وَقِنَا عَذَابَ النَّارِ",
        "transliteration": "Rabbana atina fid-dunya hasanatan wa fil-akhirati hasanatan wa qina 'adhaban-nar",
        "translation": "Our Lord, give us in this world [that which is] good and in the Hereafter [that which is] good and protect us from the punishment of the Fire",
        "reference": "Quran 2:201",
        "benefits": "Comprehensive dua for both worlds",
        "time": "Anytime"
    },
    {
        "id": comprehensiveDuas.duas.length + 24,
        "categoryId": 25,
        "title": "Dua for Increase in Knowledge",
        "arabic": "رَبِّ زِدْنِي عِلْمًا",
        "transliteration": "Rabbi zidni 'ilma",
        "translation": "My Lord, increase me in knowledge",
        "reference": "Quran 20:114",
        "benefits": "Asking for increase in beneficial knowledge",
        "time": "Anytime"
    },
    {
        "id": comprehensiveDuas.duas.length + 25,
        "categoryId": 25,
        "title": "Dua for Ease",
        "arabic": "رَبِّ يَسِّرْ وَلَا تُعَسِّرْ",
        "transliteration": "Rabbi yassir wa la tu'assir",
        "translation": "My Lord, make things easy and do not make them difficult",
        "reference": "Authentic Dua",
        "benefits": "Asking for ease in all matters",
        "time": "Anytime"
    },
    {
        "id": comprehensiveDuas.duas.length + 26,
        "categoryId": 25,
        "title": "Comprehensive Dua for Protection",
        "arabic": "اللَّهُمَّ إِنِّي أَعُوذُ بِكَ مِنْ عَذَابِ جَهَنَّمَ، وَمِنْ عَذَابِ الْقَبْرِ، وَمِنْ فِتْنَةِ الْمَحْيَا وَالْمَمَاتِ، وَمِنْ شَرِّ فِتْنَةِ الْمَسِيحِ الدَّجَّالِ",
        "transliteration": "Allahumma inni a'udhu bika min 'adhabi jahannam, wa min 'adhabil-qabr, wa min fitnatil-mahya wal-mamat, wa min sharri fitnatil-masihid-dajjal",
        "translation": "O Allah, I seek refuge in You from the punishment of Hell, from the punishment of the grave, from the trials of life and death, and from the evil of the trial of the False Messiah",
        "reference": "Bukhari 1377, Muslim 588",
        "benefits": "Comprehensive protection from major trials",
        "time": "After Tashahhud in prayer"
    },
    {
        "id": comprehensiveDuas.duas.length + 27,
        "categoryId": 25,
        "title": "Dua for Acceptance of Deeds",
        "arabic": "رَبَّنَا تَقَبَّلْ مِنَّا ۖ إِنَّكَ أَنتَ السَّمِيعُ الْعَلِيمُ",
        "transliteration": "Rabbana taqabbal minna innaka anta as-Sami'ul-'Alim",
        "translation": "Our Lord, accept [this] from us. Indeed You are the Hearing, the Knowing",
        "reference": "Quran 2:127",
        "benefits": "Asking Allah to accept our deeds",
        "time": "After good deeds"
    }
];

// Add all new duas
comprehensiveDuas.duas.push(...homeDuas, ...wuduDuas, ...mosqueDuas, ...weatherDuas, ...deathDuas, ...marriageDuas, ...angerDuas, ...debtDuas, ...hajjDuas, ...generalDuas);

// Update metadata
comprehensiveDuas.metadata.total_duas = comprehensiveDuas.duas.length;

// Save to file
const outputPath = path.join(dataDir, 'duas-comprehensive.json');
fs.writeFileSync(outputPath, JSON.stringify(comprehensiveDuas, null, 2), 'utf8');

console.log('✅ Successfully created comprehensive dua collection!');
console.log(`📊 Total Categories: ${comprehensiveDuas.metadata.total_categories}`);
console.log(`📊 Total Duas: ${comprehensiveDuas.metadata.total_duas}`);
console.log(`💾 Saved to: ${outputPath}\n`);

console.log('📋 Category Breakdown:');
comprehensiveDuas.categories.forEach(cat => {
    const count = comprehensiveDuas.duas.filter(d => d.categoryId === cat.id).length;
    console.log(`   ${cat.icon} ${cat.name}: ${count} duas`);
});

console.log('\n🎉 Comprehensive dua collection complete!');
console.log('🚀 You can now use this in your Islamic module!\n');

