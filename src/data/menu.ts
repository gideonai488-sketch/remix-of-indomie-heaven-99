import bowlAfterLectures from "@/assets/bowl-after-lectures.png";
import bowlBrokButCute from "@/assets/bowl-broke-but-cute.png";
import bowlOhChale from "@/assets/bowl-oh-chale.png";
import bowlForNow from "@/assets/bowl-for-now.png";
import bowlPickMyCalls from "@/assets/bowl-pick-my-calls.png";
import frozenYogurt from "@/assets/frozen-yogurt.png";
import bowlPamperMeNew from "@/assets/bowl-pamper-me-new.png";
import bowlImStarving from "@/assets/bowl-im-starving.png";
import bowlHeavyMe from "@/assets/bowl-heavy-me.png";
import bowlLikeJollof from "@/assets/bowl-like-jollof.png";
import bowlRideMe from "@/assets/bowl-ride-me.png";
import bowlLetsTalk from "@/assets/bowl-lets-talk.png";

export interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  category: "signature" | "sides";
  spiceLevel: 0 | 1 | 2 | 3;
  popular?: boolean;
  image: string;
  orders?: number;
}

export const menuItems: MenuItem[] = [
  {
    id: "s1",
    name: "After Lectures",
    description: "Done with class? Reward yourself — stir-fried noodles, fried egg, chicken & crispy shallots in a red bowl",
    price: 25,
    category: "signature",
    spiceLevel: 1,
    popular: true,
    image: bowlAfterLectures,
    orders: 2100,
  },
  {
    id: "s2",
    name: "Broke But Cute",
    description: "Stir-fried noodles with fried egg, veggies & chicken — cute on a budget, still slaps",
    price: 18,
    category: "signature",
    spiceLevel: 0,
    popular: true,
    image: bowlBrokButCute,
    orders: 1800,
  },
  {
    id: "s3",
    name: "Oh Chale",
    description: "Spicy loaded noodles with crispy chicken balls, boiled egg & spring onions — Saturday vibes only",
    price: 28,
    category: "signature",
    spiceLevel: 2,
    popular: true,
    image: bowlOhChale,
    orders: 1950,
  },
  {
    id: "s4",
    name: "For Now",
    description: "Loaded noodles with fried chicken, veggies & sauce — weekend loading, eat first",
    price: 22,
    category: "signature",
    spiceLevel: 1,
    image: bowlForNow,
    orders: 1500,
  },
  {
    id: "s5",
    name: "Pick My Calls",
    description: "Spicy noodles with crispy fried chicken & chili sauce — slurp to the top, no missed calls",
    price: 26,
    category: "signature",
    spiceLevel: 3,
    popular: true,
    image: bowlPickMyCalls,
    orders: 2300,
  },
  {
    id: "s6",
    name: "Pamper Me",
    description: "Grilled chicken, sautéed veggies & a perfect fried egg on stir-fried noodles — treat yourself right",
    price: 24,
    category: "signature",
    spiceLevel: 1,
    image: bowlPamperMeNew,
    orders: 1600,
  },
  {
    id: "s7",
    name: "I'm Starving",
    description: "Double fried chicken, extra noodles, egg & all the toppings — for when small chop won't cut it",
    price: 32,
    category: "signature",
    spiceLevel: 1,
    popular: true,
    image: bowlImStarving,
    orders: 2000,
  },
  {
    id: "s8",
    name: "Heavy Me",
    description: "Big crispy chicken thigh, sausage, boiled egg & veggies on loaded noodles — heavyweight champion",
    price: 35,
    category: "signature",
    spiceLevel: 1,
    image: bowlHeavyMe,
    orders: 1700,
  },
  {
    id: "s9",
    name: "Like Jollof",
    description: "Jollof-seasoned noodles with spicy tomato sauce, grilled chicken & plantain chips — taste of home",
    price: 27,
    category: "signature",
    spiceLevel: 2,
    popular: true,
    image: bowlLikeJollof,
    orders: 1900,
  },
  {
    id: "s10",
    name: "Ride Me",
    description: "Crispy shrimp, spring rolls & sweet chili on stir-fried noodles — smooth ride, bold flavors",
    price: 30,
    category: "signature",
    spiceLevel: 2,
    image: bowlRideMe,
    orders: 1550,
  },
  {
    id: "s11",
    name: "Let's Talk",
    description: "Light noodles with tofu, veggies & a soft-boiled egg — chill vibes, easy on the belly",
    price: 20,
    category: "signature",
    spiceLevel: 0,
    image: bowlLetsTalk,
    orders: 1300,
  },
  {
    id: "d1",
    name: "Frozen Yogurt",
    description: "Creamy frozen yogurt in mango, strawberry or vanilla — the perfect cool-down after a spicy bowl",
    price: 12,
    category: "sides",
    spiceLevel: 0,
    popular: true,
    image: frozenYogurt,
    orders: 1400,
  },
];

export const categories = [
  { id: "all", label: "All", emoji: "🥣" },
  { id: "signature", label: "Bowls", emoji: "👑" },
  { id: "sides", label: "Sides & Drinks", emoji: "🍦" },
] as const;
