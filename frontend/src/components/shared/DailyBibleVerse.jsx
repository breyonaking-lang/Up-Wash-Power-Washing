import React, { useState, useEffect } from 'react';
import { Book } from 'lucide-react';

// Collection of inspiring Bible verses
const BIBLE_VERSES = [
  { verse: "I can do all things through Christ who strengthens me.", reference: "Philippians 4:13" },
  { verse: "Trust in the LORD with all your heart and lean not on your own understanding.", reference: "Proverbs 3:5" },
  { verse: "For God so loved the world that he gave his one and only Son, that whoever believes in him shall not perish but have eternal life.", reference: "John 3:16" },
  { verse: "The LORD is my shepherd; I shall not want.", reference: "Psalm 23:1" },
  { verse: "Be strong and courageous. Do not be afraid; do not be discouraged, for the LORD your God will be with you wherever you go.", reference: "Joshua 1:9" },
  { verse: "And we know that in all things God works for the good of those who love him.", reference: "Romans 8:28" },
  { verse: "The LORD is my light and my salvation—whom shall I fear?", reference: "Psalm 27:1" },
  { verse: "Come to me, all you who are weary and burdened, and I will give you rest.", reference: "Matthew 11:28" },
  { verse: "But those who hope in the LORD will renew their strength.", reference: "Isaiah 40:31" },
  { verse: "Delight yourself in the LORD, and he will give you the desires of your heart.", reference: "Psalm 37:4" },
  { verse: "The LORD bless you and keep you; the LORD make his face shine on you and be gracious to you.", reference: "Numbers 6:24-25" },
  { verse: "Do not be anxious about anything, but in every situation, by prayer and petition, with thanksgiving, present your requests to God.", reference: "Philippians 4:6" },
  { verse: "For I know the plans I have for you, declares the LORD, plans to prosper you and not to harm you, plans to give you hope and a future.", reference: "Jeremiah 29:11" },
  { verse: "The name of the LORD is a fortified tower; the righteous run to it and are safe.", reference: "Proverbs 18:10" },
  { verse: "Cast all your anxiety on him because he cares for you.", reference: "1 Peter 5:7" },
  { verse: "But seek first his kingdom and his righteousness, and all these things will be given to you as well.", reference: "Matthew 6:33" },
  { verse: "The LORD is close to the brokenhearted and saves those who are crushed in spirit.", reference: "Psalm 34:18" },
  { verse: "He gives strength to the weary and increases the power of the weak.", reference: "Isaiah 40:29" },
  { verse: "Be still, and know that I am God.", reference: "Psalm 46:10" },
  { verse: "God is our refuge and strength, an ever-present help in trouble.", reference: "Psalm 46:1" },
  { verse: "Commit to the LORD whatever you do, and he will establish your plans.", reference: "Proverbs 16:3" },
  { verse: "The LORD is good, a refuge in times of trouble. He cares for those who trust in him.", reference: "Nahum 1:7" },
  { verse: "Have I not commanded you? Be strong and courageous. Do not be afraid; do not be discouraged.", reference: "Joshua 1:9" },
  { verse: "Whatever you do, work at it with all your heart, as working for the Lord, not for human masters.", reference: "Colossians 3:23" },
  { verse: "The LORD will fight for you; you need only to be still.", reference: "Exodus 14:14" },
  { verse: "No weapon forged against you will prevail.", reference: "Isaiah 54:17" },
  { verse: "I have told you these things, so that in me you may have peace.", reference: "John 16:33" },
  { verse: "The joy of the LORD is your strength.", reference: "Nehemiah 8:10" },
  { verse: "But the fruit of the Spirit is love, joy, peace, forbearance, kindness, goodness, faithfulness.", reference: "Galatians 5:22" },
  { verse: "This is the day the LORD has made; let us rejoice and be glad in it.", reference: "Psalm 118:24" },
  { verse: "Give thanks to the LORD, for he is good; his love endures forever.", reference: "Psalm 107:1" }
];

// Get verse based on day of year (rotates daily)
const getDailyVerse = () => {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 0);
  const diff = now - start;
  const oneDay = 1000 * 60 * 60 * 24;
  const dayOfYear = Math.floor(diff / oneDay);
  const verseIndex = dayOfYear % BIBLE_VERSES.length;
  return BIBLE_VERSES[verseIndex];
};

export default function DailyBibleVerse({ variant = 'default' }) {
  const [verse, setVerse] = useState(getDailyVerse());

  useEffect(() => {
    setVerse(getDailyVerse());
  }, []);

  if (variant === 'compact') {
    return (
      <div className="bg-gradient-to-r from-amber-500/20 to-yellow-500/20 backdrop-blur rounded-xl px-4 py-3 border border-amber-500/30">
        <div className="flex items-center gap-2">
          <Book className="w-4 h-4 text-amber-400 flex-shrink-0" />
          <p className="text-amber-100 text-sm italic">"{verse.verse}"</p>
          <span className="text-amber-400 text-xs whitespace-nowrap">— {verse.reference}</span>
        </div>
      </div>
    );
  }

  if (variant === 'banner') {
    return (
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 py-3 px-4">
        <div className="container mx-auto max-w-7xl flex items-center justify-center gap-3">
          <Book className="w-5 h-5 text-white/80" />
          <p className="text-white text-center">
            <span className="italic">"{verse.verse}"</span>
            <span className="text-white/80 ml-2">— {verse.reference}</span>
          </p>
        </div>
      </div>
    );
  }

  // Default variant
  return (
    <div className="bg-gradient-to-r from-amber-500/10 to-yellow-500/10 backdrop-blur-lg rounded-2xl p-6 border border-amber-500/20">
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 bg-amber-500/20 rounded-xl flex items-center justify-center flex-shrink-0">
          <Book className="w-6 h-6 text-amber-400" />
        </div>
        <div>
          <p className="text-white text-lg italic mb-2">"{verse.verse}"</p>
          <p className="text-amber-400 font-semibold">— {verse.reference}</p>
        </div>
      </div>
    </div>
  );
}
