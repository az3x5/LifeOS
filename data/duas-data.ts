export interface Dua {
    arabic: string;
    transliteration: string;
    translation: string;
}

export interface DuaCategory {
    category: string;
    duas: Dua[];
}

export const duas: DuaCategory[] = [
    {
        category: "Morning & Evening",
        duas: [
            {
                arabic: "بِسْمِ اللهِ الَّذِي لَا يَضُرُّ مَعَ اسْمِهِ شَيْءٌ فِي الْأَرْضِ وَلَا فِي السَّمَاءِ وَهُوَ السَّمِيعُ الْعَلِيمُ",
                transliteration: "Bismillahi-lladhi la yadurru ma'a-smihi shai'un fi-l-ardhi wa la fi-s-sama'i wa huwa-s-Sami'u-l-'Alim.",
                translation: "In the Name of Allah, with Whose Name nothing on earth or in the heavens can cause harm, and He is the All-Hearing, the All-Knowing."
            },
            {
                arabic: "أَعُوذُ بِكَلِمَاتِ اللهِ التَّامَّاتِ مِنْ شَرِّ مَا خَلَقَ",
                transliteration: "A'udhu bikalimati-llahi-t-tammati min sharri ma khalaq.",
                translation: "I seek refuge in the perfect words of Allah from the evil of that which He has created."
            }
        ]
    },
    {
        category: "Before Eating",
        duas: [
            {
                arabic: "بِسْمِ اللهِ",
                transliteration: "Bismillah.",
                translation: "In the Name of Allah."
            }
        ]
    },
    {
        category: "After Eating",
        duas: [
            {
                arabic: "الْحَمْدُ للهِ الَّذِي أَطْعَمَنِي هَذَا وَرَزَقَنِيهِ مِنْ غَيْرِ حَوْلٍ مِنِّي وَلَا قُوَّةٍ",
                transliteration: "Alhamdu lillahi-lladhi at'amani hadha wa razaqanihi min ghayri hawlin minni wa la quwwah.",
                translation: "Praise is to Allah Who has fed me this and provided it for me without any strength or power on my part."
            }
        ]
    },
    {
        category: "Seeking Knowledge",
        duas: [
            {
                arabic: "رَبِّ زِدْنِي عِلْمًا",
                transliteration: "Rabbi zidni 'ilma.",
                translation: "My Lord, increase me in knowledge."
            }
        ]
    }
];
