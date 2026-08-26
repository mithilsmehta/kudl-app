/**
 * Product artwork pool for the KUDL catalog seed.
 *
 * Every URL here was fetched and visually checked before being added, and the
 * key names describe what the photo actually shows — not what it was searched
 * for. That matters because `images.unsplash.com` 404s on an invented photo id
 * and the storefront's ProductImage component degrades a broken URL to a grey
 * placeholder icon, so a wrong id fails quietly as an empty-looking product
 * card rather than as an error anyone would notice.
 *
 * The pool is smaller than the catalog on purpose: photos are reused across
 * products that share a theme (every dry-food SKU shows kibble) instead of
 * each product getting a unique but unrelated stock photo. `images.unsplash.com`
 * is already declared in the storefront's next.config.js remotePatterns, so
 * next/image will optimise these rather than fall back to a plain <img>.
 */

const unsplash = (id: string) =>
  `https://images.unsplash.com/${id}?w=1200&h=1200&fit=crop`

export const IMAGES = {
  // Food — kibble and prepared meals in bowls.
  kibbleBowlWood: unsplash("photo-1589924691995-400dc9ecc119"),
  kibbleBowlBlue: unsplash("photo-1676193866128-03a926df76ef"),
  kibbleCloseup: unsplash("photo-1764249453850-faace6e57444"),
  wetFoodBowl: unsplash("photo-1745252798506-29500efc5b39"),
  dogAtBowl: unsplash("photo-1723065314557-e2a6b8a41d08"),
  catAtBowl: unsplash("photo-1558993457-4bc6ec2c3734"),

  // Treats — biscuits, bones and treat-giving.
  boneBiscuitsPink: unsplash("photo-1568640347023-a616a30bc3bd"),
  treatsInBowl: unsplash("photo-1695169954725-fa757fd7315c"),
  dogLicking: unsplash("photo-1518717758536-85ae29035b6d"),
  catTakingTreat: unsplash("photo-1781120810307-e35a8dc5ca9e"),

  // Pharmacy — tablets, blister packs and dispensing bottles.
  pillsSpilling: unsplash("photo-1628771065518-0d82f1938462"),
  blisterPacksPile: unsplash("photo-1631549916768-4119b2e5f926"),
  blisterPacks: unsplash("photo-1584308666744-24d5c474f2ae"),
  assortedTablets: unsplash("photo-1471864190281-a93a3070b6de"),
  prescriptionBottle: unsplash("photo-1562243061-204550d8a2c9"),
  pillsInPalm: unsplash("photo-1607874963930-2edecc67a25a"),
  dogWithBottle: unsplash("photo-1681305694935-9048ba34d72f"),

  // Walk & travel — leashes, harnesses, collars, carriers, crates.
  leashOnWood: unsplash("photo-1708062270853-ee7c66b69f07"),
  dogOnLeash: unsplash("photo-1555265626-8ed04bde01a1"),
  harnessGolden: unsplash("photo-1581597359121-0f69057e2fb1"),
  harnessService: unsplash("photo-1598962056963-9323f7a1dac2"),
  harnessDachshund: unsplash("photo-1618865843655-e2723e296243"),
  harnessBlue: unsplash("photo-1580129518790-0482fc5eed65"),
  puppyTealCollar: unsplash("photo-1601979031925-424e53b6caaa"),
  puppyRedCollar: unsplash("photo-1507146426996-ef05306b995a"),
  carrierOnFloor: unsplash("photo-1778856582851-9da9e3a1a831"),
  catInCarrier: unsplash("photo-1761614282055-29e039aac354"),
  dogInShoulderBag: unsplash("photo-1779638416594-c56bcb5c8682"),
  dogInCrate: unsplash("photo-1764813824215-4afa03d1a011"),
  dogsRunning: unsplash("photo-1548199973-03cce0bbc87b"),

  // Toys.
  tennisBall: unsplash("photo-1670898839060-8b0a8902ee1e"),
  dogWithPlushToy: unsplash("photo-1591946614720-90a587da4a36"),
  puppyWithToy: unsplash("photo-1594149929911-78975a43d4f5"),
  kittenScratcher: unsplash("photo-1545249390-6bdfa286032f"),
  catStretching: unsplash("photo-1571566882372-1598d88abd90"),
  catWithButterfly: unsplash("photo-1526336024174-e58f5cdd8e13"),

  // Grooming & hygiene.
  shampooBottles: unsplash("photo-1621552852078-0c0d0e2c41ec"),
  brushesInBowl: unsplash("photo-1635094420131-0337a3e732fc"),
  fluffyCatCoat: unsplash("photo-1592404959620-886f59d6443a"),
  catLitterBox: unsplash("photo-1727510153658-643787acb16a"),

  // Clothing.
  frenchieYellowShirt: unsplash("photo-1583337130417-3346a1be7dee"),
  frenchieYellowHoodie: unsplash("photo-1583511655857-d19b40a7a54e"),
  pugKnitScarf: unsplash("photo-1541364983171-a8ba01e95cfc"),

  // Beds, mats & furniture.
  dogInGreyBed: unsplash("photo-1581888227599-779811939961"),
  dogInRoundBed: unsplash("photo-1601758123927-4f7acc7da589"),
  frenchieInRedBed: unsplash("photo-1645687441930-e2010b3db02a"),
  poodlesInBed: unsplash("photo-1646195164326-124b72fb9d34"),
  catLounging: unsplash("photo-1573865526739-10659fec78a5"),
  catsCuddling: unsplash("photo-1511044568932-338cba0ad803"),
  catOnStairs: unsplash("photo-1495360010541-f48722b34f7d"),
  whiteMaineCoon: unsplash("photo-1606214174585-fe31582dc6ee"),
} as const

export type ImageKey = keyof typeof IMAGES
