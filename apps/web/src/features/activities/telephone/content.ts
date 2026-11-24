/** 🎲 ideas for the first prompt (and for Copycat's first drawing). */
export const PROMPTS = [
  'a cat stuck in a bubble tea',
  'a sleepy dragon doing homework',
  'a penguin on holiday',
  'a robot falling in love with a toaster',
  'a snail winning a race',
  'a ghost who is scared of people',
  'a frog playing guitar',
  'a pizza with feelings',
  'a duck in a business meeting',
  'a cactus that wants a hug',
  'a house on a giant turtle',
  'a fish riding a bicycle',
  'a sun wearing sunglasses',
  'a potato going to the gym',
  'a flower that can sing',
  'a tree with a door',
  'grandma on a skateboard',
  'a cloud that is crying rice',
  'a dog cooking noodles',
  'an alien at the dentist',
];

export const randomPrompt = () => PROMPTS[Math.floor(Math.random() * PROMPTS.length)]!;
