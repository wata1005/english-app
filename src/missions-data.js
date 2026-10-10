// Scripted, on-device Stage D content. Each round has a visual context, prompt and meaningful outcome.
(function(root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.MissionContent = factory();
})(this, function() {
  const MODES = {
    listen: { ja: 'きいて おてつだい', en: 'Little Helpers', icon: '🧺', skill: 'listening' },
    talk: { ja: 'おしゃべり ごっこ', en: 'Talk Together', icon: '🐰', skill: 'speaking' },
    phonics: { ja: 'おとの おにわ', en: 'Sound Garden', icon: '🌱', skill: 'reading' },
    story: { ja: 'おはなし の もり', en: 'Story Forest', icon: '📖', skill: 'reading' },
    message: { ja: 'まほうの おてがみ', en: 'Magic Mail', icon: '💌', skill: 'writing' }
  };
  const OBJECTS = [{ id: 'apple', icon: '🍎' }, { id: 'banana', icon: '🍌' }, { id: 'carrot', icon: '🥕' }];
  const FRIENDS = [{ id: 'rabbit', icon: '🐰' }, { id: 'bear', icon: '🐻' }, { id: 'frog', icon: '🐸' }];
  const STORIES = [
    { id: 'picnic', title: 'Rabbit’s Picnic', pages: [
      { icon: '🐰🍎', line: 'Rabbit finds an apple.' }, { icon: '🐰➡️🐻', line: 'Rabbit takes the apple to Bear.' }, { icon: '🐰🐻😋', line: 'They eat together.' }
    ] },
    { id: 'garden', title: 'A Little Seed', pages: [
      { icon: '🐻🌱', line: 'Bear plants a seed.' }, { icon: '🐻💧', line: 'Bear gives it water.' }, { icon: '🌻🐻', line: 'A flower grows. Bear is happy.' }
    ] },
    { id: 'rain', title: 'A Rainy Day', pages: [
      { icon: '🐸🌧️', line: 'Frog sees the rain.' }, { icon: '🐰☂️', line: 'Rabbit brings an umbrella.' }, { icon: '🐸🐰☂️', line: 'They walk home together.' }
    ] }
  ];
  const TALK = {
    1: [
      { id: 'hello', icon: '🐰👋', prompt: 'Hello!', model: 'Hello!', outcome: 'Hello, friend!' },
      { id: 'thanks', icon: '🐻🎁', prompt: 'Here you are!', model: 'Thank you!', outcome: 'You are welcome!' },
      { id: 'bye', icon: '🐸👋', prompt: 'Bye!', model: 'Bye!', outcome: 'See you soon!' }
    ],
    2: [
      { id: 'request-apple', icon: '🐰🍎🧺', prompt: 'Welcome to my shop! What would you like?', model: 'An apple, please.', outcome: 'Here is your apple!', canDo: 'L2_SP_01' },
      { id: 'request-banana', icon: '🐰🍌🧺', prompt: 'Welcome to my shop! What would you like?', model: 'A banana, please.', outcome: 'Here is your banana!', canDo: 'L2_SP_01' },
      { id: 'request-carrot', icon: '🐰🥕🧺', prompt: 'Welcome to my shop! What would you like?', model: 'A carrot, please.', outcome: 'Here is your carrot!', canDo: 'L2_SP_01' },
      { id: 'like', icon: '🐻🍎', prompt: 'Do you like apples?', model: 'Yes, I do.', outcome: 'Thank you for telling me!', canDo: 'L2_SP_02' },
      { id: 'name', icon: '🐰🍌', prompt: 'What is this?', model: 'A banana.', outcome: 'That is a banana!', canDo: 'L2_SP_02' },
      { id: 'feeling', icon: '🐸🙂', prompt: 'How are you?', model: 'I am happy.', outcome: 'Thank you for telling me!', canDo: 'L2_SP_02' }
    ],
    3: [
      { id: 'run', icon: '🐰💨', prompt: 'Rabbit is moving fast. What is Rabbit doing?', model: 'Rabbit is running.', outcome: 'Run, Rabbit, run!', canDo: 'L3_SP_01' },
      { id: 'eat', icon: '🐻🍎😋', prompt: 'What is Bear doing?', model: 'Bear is eating.', outcome: 'Yummy!', canDo: 'L3_SP_01' },
      { id: 'sleep', icon: '🐸💤', prompt: 'What is Frog doing?', model: 'Frog is sleeping.', outcome: 'Good night, Frog!', canDo: 'L3_SP_01' },
      ...['on', 'under', 'in'].map(place => ({ id: 'place-' + place, icon: '🐱', place, prompt: 'Where is the cat?', model: 'The cat is ' + place + ' the box.', outcome: 'You found the cat!', canDo: 'L3_SP_02' }))
    ],
    4: [
      { id: 'reason-rain', icon: '🌧️☂️', prompt: 'Why do we need an umbrella?', model: 'Because it is raining.', outcome: 'Let us stay dry!', canDo: 'L4_SP_01' },
      { id: 'reason-hungry', icon: '🐰🍎', prompt: 'Why does Rabbit need food?', model: 'Because Rabbit is hungry.', outcome: 'Let us share some food!', canDo: 'L4_SP_01' },
      { id: 'reason-cold', icon: '❄️🧥', prompt: 'Why do we need a coat?', model: 'Because it is cold.', outcome: 'Let us keep warm!', canDo: 'L4_SP_01' },
      { id: 'ask-place', icon: '🐰❓🐻', prompt: 'You are looking for Bear. Ask Rabbit where Bear is.', model: 'Where is Bear?', outcome: 'Bear is in the garden!', canDo: 'L4_SP_02' },
      { id: 'ask-name', icon: '🐸❓', prompt: 'Meet a new friend. Ask your friend their name.', model: 'What is your name?', outcome: 'My name is Frog!', canDo: 'L4_SP_02' },
      { id: 'ask-like', icon: '🐻🍎❓', prompt: 'Find out if Bear likes apples. Ask Bear.', model: 'Do you like apples?', outcome: 'Yes, I do!', canDo: 'L4_SP_02' }
    ]
  };
  const STAMPS = [
    { id: 'comfort', icon: '🐰😢', prompt: 'Rabbit is sad. Send something kind.', accepts: ['❤️', '🌻'], outcome: 'Rabbit feels loved. Thank you!' },
    { id: 'birthday', icon: '🐻🎉', prompt: 'It is Bear’s birthday. Send a present.', accepts: ['🎁', '🎂'], outcome: 'Happy birthday, Bear!' },
    { id: 'goodbye', icon: '🐸🚪', prompt: 'Frog is going home. Send a goodbye.', accepts: ['👋'], outcome: 'Bye, Frog! See you soon!' }
  ];
  const WORDS = ['mat', 'sat', 'pin', 'sit', 'nap', 'tap'];
  const SENTENCES = ['The cat is on the mat.', 'The pig is in the pen.', 'The dog can run.'];
  const SOUND_WORDS = [{ sound: 'm', word: 'monkey' }, { sound: 's', word: 'sun' }, { sound: 'f', word: 'fish' },
    { sound: 'm', word: 'milk' }, { sound: 's', word: 'sock' }, { sound: 'f', word: 'fan' }];
  // Build-time audio inventory includes every task prompt, model and outcome, independently of random order.
  function phrases() {
    const out = new Set(['Listen to the first sound.', 'First', 'Next', 'Last', 'Send your message.', 'Tell the story in order.',
      'What happens next?', 'Listen again.', 'Great helping!', 'Let us try again.', 'You can ask a grown-up to listen.', 'Read it yourself.']);
    OBJECTS.forEach(o => FRIENDS.forEach(f => {
      out.add(`Give the ${o.id} to ${f.id}.`);
      out.add(`Touch the ${o.id}, then touch ${f.id}.`);
      ['on', 'under', 'in'].forEach(place => out.add(`Put the ${o.id} ${place} the box.`));
    }));
    out.add('Rabbit is hungry. Bear has an apple. Give the apple to Rabbit.');
    out.add('Bear is hungry. Frog has a banana. Give the banana to Bear.');
    out.add('Frog is hungry. Rabbit has a carrot. Give the carrot to Frog.');
    STORIES.forEach(s => s.pages.forEach(p => out.add(p.line)));
    Object.values(TALK).flat().forEach(t => [t.prompt, t.model, t.outcome].forEach(v => out.add(v)));
    STAMPS.forEach(t => [t.prompt, t.outcome].forEach(v => out.add(v)));
    SOUND_WORDS.forEach(t => out.add(t.word));
    OBJECTS.forEach(o => {
      out.add(`Rabbit is hungry. Ask for the ${o.id}.`);
      out.add(`I want ${o.id === 'apple' ? 'an' : 'a'} ${o.id}.`);
      out.add(`Please give me ${o.id === 'apple' ? 'an' : 'a'} ${o.id}.`);
      out.add(`Could you bring ${o.id === 'apple' ? 'an' : 'a'} ${o.id} to Rabbit?`);
      out.add(`Here is the ${o.id}. Rabbit is happy!`);
    });
    WORDS.forEach(w => out.add(w)); SENTENCES.forEach(s => out.add(s));
    return [...out];
  }
  return { MODES, OBJECTS, FRIENDS, STORIES, TALK, STAMPS, WORDS, SENTENCES, SOUND_WORDS, phrases };
});
