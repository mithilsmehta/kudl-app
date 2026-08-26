/*
 * Prices are in MAJOR units: `amount: 1899` means ₹1899, not ₹18.99. See the
 * note at the top of dogs.ts — do not divide these by 100.
 */
/* eslint-disable @medusajs/prices-in-major-units */

/**
 * Pharmacy branch of the KUDL catalog — the cross-species branch of the
 * taxonomy, so these products live under the Pharmacy category tree rather
 * than under Dogs or Cats. Every `column` / `item` pair must exist in
 * pharmacyMenu in lib/taxonomy.ts; seed-kudl-catalog.ts validates and throws
 * otherwise, and derives `metadata.pharmacyCategory` from `item` so the
 * storefront's pharmacy filter matches without a second declaration.
 *
 * Each product still carries a `petType`, because the storefront's pet-type
 * filter would otherwise hide them: the branch is cross-species but any one
 * SKU is dosed and formulated for a single animal.
 *
 * Descriptions describe what a product is for and how it is used. They are
 * deliberately explicit that prescription items need a veterinarian, since
 * this is a demo catalog and the copy should not read as medical advice.
 */

import { CatalogProduct } from "./types"

const ALL_BREEDS = [
  "golden-retriever",
  "german-shepherd",
  "labrador",
  "rottweiler",
  "beagle",
  "shih-tzu",
  "boxer",
]

export const pharmacyProducts: CatalogProduct[] = [
  // ─── Supplements ─────────────────────────────────────────────────────────
  {
    title: "KUDL Daily Multivitamin Tablets for Dogs",
    handle: "kudl-daily-multivitamin-dogs",
    petType: "dogs",
    tree: "pharmacy",
    column: "Supplements",
    item: "Multivitamins",
    brand: "KUDL Essentials",
    category: "grooming-health",
    breeds: ALL_BREEDS,
    rating: 4.3,
    reviewCount: 1188,
    image: "assortedTablets",
    weight: 150,
    description:
      "A palatable daily tablet covering the vitamins and trace minerals a dog needs — the B group, A, D3, E, plus zinc, iron, copper and selenium — at maintenance rather than therapeutic levels. Worth being straight about who this is for: a healthy dog eating a complete commercial diet is already getting all of this and does not need a supplement, because a complete food is formulated to meet the full requirement. Where a multivitamin does earn its place is with a home-cooked or otherwise unbalanced diet, a fussy eater that consistently leaves part of its ration, a dog convalescing after illness or surgery, and an older dog whose absorption has declined. Liver-flavoured so it can be given by hand as a treat. Dose by bodyweight, once daily with food. Do not stack it with another vitamin product — fat-soluble vitamins A and D accumulate, and over-supplementing them causes real harm. Check with your vet before starting a dog on any long-term supplement.",
    variants: [
      { title: "60 tablets", sku: "KUDL-PH-MULTIVIT-D60", amount: 549 },
      { title: "120 tablets", sku: "KUDL-PH-MULTIVIT-D120", amount: 999 },
    ],
  },
  {
    title: "KUDL Calcium & Vitamin D3 Syrup for Dogs",
    handle: "kudl-calcium-vitamin-d3-syrup-dogs",
    petType: "dogs",
    tree: "pharmacy",
    column: "Supplements",
    item: "Calcium supplements",
    brand: "KUDL Essentials",
    category: "grooming-health",
    breeds: ALL_BREEDS,
    rating: 4.2,
    reviewCount: 864,
    image: "prescriptionBottle",
    weight: 250,
    description:
      "A palatable calcium syrup with phosphorus in a controlled ratio and vitamin D3 to drive absorption, since calcium given without D3 is largely wasted. The situations it is intended for are specific: a pregnant or nursing bitch, whose demand rises sharply while she is producing milk; a growing puppy on a home-prepared diet that has not been balanced by a nutritionist; and a dog recovering from a fracture, on veterinary advice. The important counterpoint is that a puppy on a complete commercial growth food must not be given extra calcium — over-supplementation during growth is a recognised cause of developmental orthopaedic disease in large breeds, and more is emphatically not better here. Measure the dose with the supplied cup by bodyweight and give it with or after a meal. Shake before use, refrigerate after opening, use within a month of opening, and speak to your vet before starting it on a growing dog.",
    variants: [
      { title: "200ml", sku: "KUDL-PH-CALCIUM-200ML", amount: 379 },
      { title: "400ml", sku: "KUDL-PH-CALCIUM-400ML", amount: 649 },
    ],
  },
  {
    title: "KUDL Immunity Booster Chews with Colostrum",
    handle: "kudl-immunity-booster-chews",
    petType: "dogs",
    tree: "pharmacy",
    column: "Supplements",
    item: "Immunity Boosters",
    brand: "KUDL Essentials",
    category: "grooming-health",
    breeds: ALL_BREEDS,
    rating: 4.1,
    reviewCount: 517,
    image: "pillsInPalm",
    weight: 200,
    description:
      "Soft chews built around bovine colostrum, beta-glucans and a vitamin C and E antioxidant pair, aimed at supporting immune function during the periods when a dog is under most strain. Those periods are the honest use case: the weeks after a puppy leaves its litter and loses maternal antibody cover, a boarding stay or a dog show where it meets many unfamiliar dogs, recovery from an illness, and old age. A supplement supports a functioning immune system; it does not substitute for vaccination, and it will not treat an existing infection — a dog that is genuinely unwell needs a diagnosis rather than a chew. Colostrum supplies immunoglobulins and beta-glucans prime the innate immune response, both reasonably well-studied mechanisms. Given once daily by weight, and palatable enough to hand over as a treat. Store cool and dry. Discuss it with your vet before giving it to a dog on immunosuppressive medication.",
    variants: [{ title: "60 chews", sku: "KUDL-PH-IMMUNITY-60", amount: 799 }],
  },
  {
    title: "KUDL Calming Chews with L-Theanine & Chamomile",
    handle: "kudl-calming-chews-l-theanine",
    petType: "dogs",
    tree: "pharmacy",
    column: "Supplements",
    item: "Calming & Anxiety",
    brand: "KUDL Essentials",
    category: "grooming-health",
    breeds: ALL_BREEDS,
    rating: 4.4,
    reviewCount: 1622,
    image: "pillsSpilling",
    weight: 180,
    description:
      "Soft chews combining L-theanine, chamomile, passionflower and magnesium, intended to take the edge off situational anxiety — fireworks and thunder, a car journey, a vet visit, a house full of guests, or the first weeks in a new home. Set expectations correctly: these are mild, they work best given about half an hour to an hour before a predictable trigger, and they are a support alongside management rather than a sedative. For a dog with genuine separation distress or a noise phobia severe enough to cause self-injury, the effective treatment is a behaviour modification plan and, often, prescription medication from a vet — a supplement alone will not resolve it. What does help alongside this is a covered den, background sound, and not reinforcing the panic. Liver-flavoured, given by weight, and safe for daily use through a stressful period. Do not combine with a prescription sedative or antidepressant without asking your vet first.",
    variants: [
      { title: "30 chews", sku: "KUDL-PH-CALM-30", amount: 599 },
      { title: "60 chews", sku: "KUDL-PH-CALM-60", amount: 1049 },
    ],
  },
  {
    title: "KUDL Appetite Stimulant Syrup for Cats",
    handle: "kudl-appetite-stimulant-syrup-cats",
    petType: "cats",
    tree: "pharmacy",
    column: "Supplements",
    item: "Appetite Stimulants",
    brand: "KUDL Essentials",
    category: "grooming-health",
    rating: 4.0,
    reviewCount: 342,
    image: "prescriptionBottle",
    weight: 120,
    description:
      "A B-complex and lysine syrup with a strong malt flavour, intended to encourage a cat back onto food after a short illness, a dental procedure or a stressful upheaval. The reason appetite matters so much more in cats than in dogs is hepatic lipidosis: a cat that stops eating for even a couple of days starts mobilising fat faster than its liver can process it, and that is a serious, sometimes fatal condition. So a cat that is off its food is time-sensitive rather than something to watch for a week. This syrup is a supportive measure only. If your cat has eaten nothing for twenty-four hours, or is eating far less than usual for more than two or three days, it needs a vet — inappetence is a symptom, and the underlying causes range from dental pain to kidney disease to an intestinal blockage. Give the measured dose directly or mixed into a small amount of strongly scented wet food. Refrigerate after opening.",
    variants: [{ title: "100ml", sku: "KUDL-PH-APPETITE-100ML", amount: 449 }],
  },

  // ─── Antibiotics ─────────────────────────────────────────────────────────
  {
    title: "Amoxicillin-Clavulanate Tablets for Dogs (Rx)",
    handle: "amoxicillin-clavulanate-tablets-dogs-rx",
    petType: "dogs",
    tree: "pharmacy",
    column: "Antibiotics",
    item: "Antibiotics",
    brand: "KUDL Pharmacy",
    category: "grooming-health",
    breeds: ALL_BREEDS,
    rating: 4.6,
    reviewCount: 289,
    image: "blisterPacks",
    weight: 40,
    description:
      "A broad-spectrum antibiotic combining amoxicillin with clavulanic acid, a beta-lactamase inhibitor that protects the amoxicillin from bacterial enzymes and so covers organisms that plain amoxicillin cannot. It is commonly prescribed for skin and soft tissue infections, wound infections, urinary tract infections, dental infections and respiratory infections. This is a prescription-only medicine and requires a valid veterinary prescription — the reasons are not bureaucratic. An antibiotic only works against the right bacteria, it does nothing at all for a viral illness, and the dose and duration depend on the site of infection and your dog's weight and kidney function. Finish the full course exactly as prescribed even once your dog looks well, because stopping early is precisely how resistant bacteria are selected for. Give with food to reduce stomach upset. Tell your vet about any known penicillin reaction, and report vomiting, diarrhoea or a rash. Never give a dog a leftover human antibiotic.",
    variants: [
      { title: "250mg — 10 tablets", sku: "KUDL-PH-AMOXICLAV-250-10", amount: 449 },
      { title: "500mg — 10 tablets", sku: "KUDL-PH-AMOXICLAV-500-10", amount: 699 },
    ],
  },

  // ─── Prescription Diet ───────────────────────────────────────────────────
  {
    title: "Royal Canin Urinary S/O Dry Cat Food (Rx)",
    handle: "royal-canin-urinary-so-cat-rx",
    petType: "cats",
    tree: "pharmacy",
    column: "Prescription Diet",
    item: "Urinary",
    brand: "Royal Canin",
    category: "food",
    rating: 4.8,
    reviewCount: 476,
    image: "kibbleBowlBlue",
    weight: 1500,
    description:
      "A veterinary therapeutic diet for cats with lower urinary tract disease, formulated to dissolve struvite stones and to reduce the risk of both struvite and calcium oxalate recurrence. It works on two fronts: the mineral content is adjusted so urine is less saturated with the components that crystallise, and the formula promotes a higher urine volume and a target pH, since dilute urine is the single most protective factor against stones forming. This is one of the more important diets in veterinary medicine — a blocked male cat is a genuine emergency, and recurrence is common enough that diet is usually a permanent change rather than a course. Feed it as the sole diet, since treats and other food undo the mineral balance it depends on, and keep water freely available and in more than one place. Prescription only: your vet will confirm the stone type from urinalysis or imaging, because the diet for oxalate differs from the diet for struvite.",
    variants: [
      { title: "1.5kg", sku: "KUDL-PH-RC-URINARY-1.5KG", amount: 1799 },
      { title: "3.5kg", sku: "KUDL-PH-RC-URINARY-3.5KG", amount: 3599 },
    ],
  },
  {
    title: "Royal Canin Mobility Support Dry Dog Food (Rx)",
    handle: "royal-canin-mobility-support-dog-rx",
    petType: "dogs",
    tree: "pharmacy",
    column: "Prescription Diet",
    item: "Joint & Mobility",
    brand: "Royal Canin",
    category: "food",
    breeds: ALL_BREEDS,
    rating: 4.7,
    reviewCount: 318,
    image: "kibbleBowlBlue",
    weight: 2000,
    description:
      "A therapeutic joint diet for dogs with osteoarthritis or chronic joint pain, combining a high level of EPA and DHA from fish oil with green-lipped mussel extract, glucosamine and chondroitin. The omega-3 level is the part that distinguishes a therapeutic diet from an over-the-counter joint supplement — it is high enough to have a measurable anti-inflammatory effect, and dogs on diets like this often need a lower dose of pain medication as a result. The calorie density is held moderate on purpose, because keeping an arthritic dog lean is the single most effective thing you can do for its comfort: every extra kilogram is load carried through painful joints, and weight loss alone visibly improves lameness. Feed as the sole diet and weigh the portions. Prescription only, and most effective as one part of a plan that also includes controlled exercise, weight management and pain relief prescribed by your vet.",
    variants: [
      { title: "2kg", sku: "KUDL-PH-RC-MOBILITY-2KG", amount: 1999 },
      { title: "7kg", sku: "KUDL-PH-RC-MOBILITY-7KG", amount: 5499 },
    ],
  },
  {
    title: "Royal Canin Satiety Weight Management Dog Food (Rx)",
    handle: "royal-canin-satiety-weight-management-dog-rx",
    petType: "dogs",
    tree: "pharmacy",
    column: "Prescription Diet",
    item: "Weight Management",
    brand: "Royal Canin",
    category: "food",
    breeds: ALL_BREEDS,
    rating: 4.6,
    reviewCount: 402,
    image: "kibbleBowlWood",
    weight: 3000,
    description:
      "A therapeutic weight-loss diet with a very high fibre content and a high protein-to-calorie ratio, built to solve the practical problem with dieting a dog: simply feeding less of a regular food leaves the dog hungry, begging and often nutritionally short. Here the fibre bulks the meal so the dog feels full on far fewer calories, and the protein level protects lean muscle so what comes off is fat rather than muscle mass. Vitamins and minerals are concentrated so a reduced portion still meets the full requirement. This matters because canine obesity is not cosmetic — it shortens life expectancy and worsens arthritis, breathing and diabetes risk. Feed as the sole diet, weigh every portion, and cut treats or switch to pieces of the same kibble. Prescription only: your vet will set a target weight and a rate of loss, and weigh your dog monthly, because losing weight too quickly is its own problem.",
    variants: [
      { title: "1.5kg", sku: "KUDL-PH-RC-SATIETY-1.5KG", amount: 1699 },
      { title: "6kg", sku: "KUDL-PH-RC-SATIETY-6KG", amount: 4999 },
    ],
  },
  {
    title: "Royal Canin Hypoallergenic Dry Dog Food (Rx)",
    handle: "royal-canin-hypoallergenic-dog-rx",
    petType: "dogs",
    tree: "pharmacy",
    column: "Prescription Diet",
    item: "Hypoallergenic",
    brand: "Royal Canin",
    category: "food",
    breeds: ALL_BREEDS,
    rating: 4.7,
    reviewCount: 267,
    image: "kibbleBowlBlue",
    weight: 2000,
    description:
      "A hydrolysed-protein diet for dogs with a suspected or confirmed food allergy, where the protein has been broken into fragments too small for the immune system to recognise and react to. That is the mechanism that makes it different from a novel-protein food: an allergic dog cannot mount a response against a protein it cannot identify. It is used both diagnostically and therapeutically — a strict eight-week elimination trial on this diet and nothing else is the accepted way to establish whether a dog's chronic itching, recurrent ear infections or persistent loose stools are food-driven, since blood allergy tests are unreliable for food in dogs. The word strict is doing real work: one treat, one flavoured chewable tablet or one scrap from the table invalidates the trial, which is the usual reason a trial appears to fail. Prescription only, and your vet will guide the trial and the reintroduction that follows it.",
    variants: [
      { title: "2kg", sku: "KUDL-PH-RC-HYPO-2KG", amount: 2199 },
      { title: "7kg", sku: "KUDL-PH-RC-HYPO-7KG", amount: 6199 },
    ],
  },

  // ─── Pain Medication ─────────────────────────────────────────────────────
  {
    title: "Meloxicam Oral Suspension for Dogs (Rx)",
    handle: "meloxicam-oral-suspension-dogs-rx",
    petType: "dogs",
    tree: "pharmacy",
    column: "Pain Medication",
    item: "Pain Medication",
    brand: "KUDL Pharmacy",
    category: "grooming-health",
    breeds: ALL_BREEDS,
    rating: 4.7,
    reviewCount: 391,
    image: "prescriptionBottle",
    weight: 130,
    description:
      "A non-steroidal anti-inflammatory in a honey-flavoured oral suspension, prescribed for the pain and inflammation of osteoarthritis and for post-operative and soft tissue pain. It is supplied as a liquid with a graduated syringe for a good reason: NSAID dosing in dogs is weight-critical and a liquid can be measured to the kilogram in a way a split tablet cannot. Given once daily, with or after food. This is prescription-only and the caution is serious rather than routine. NSAIDs can cause gastrointestinal ulceration and affect the kidneys and liver, so your vet will check bloodwork before a long course and periodically during one, and will avoid it in a dehydrated dog or one already on a steroid. Stop it and call your vet if your dog vomits, goes off its food, or produces black or bloody stool. Never give a dog human ibuprofen, paracetamol or aspirin — those are toxic at doses people assume are safe, and paracetamol is lethal to cats.",
    variants: [
      { title: "10ml", sku: "KUDL-PH-MELOXICAM-10ML", amount: 399 },
      { title: "32ml", sku: "KUDL-PH-MELOXICAM-32ML", amount: 899 },
    ],
  },

  // ─── System Wise ─────────────────────────────────────────────────────────
  {
    title: "KUDL Medicated Antifungal Skin Spray",
    handle: "kudl-medicated-antifungal-skin-spray",
    petType: "dogs",
    tree: "pharmacy",
    column: "System Wise",
    item: "Skin care",
    brand: "KUDL Pharmacy",
    category: "grooming-health",
    breeds: ALL_BREEDS,
    rating: 4.4,
    reviewCount: 728,
    image: "dogWithBottle",
    weight: 120,
    description:
      "A topical spray combining chlorhexidine with an antifungal, for the localised skin infections that follow scratching, a hot spot, a skin fold that stays damp, or a patch of ringworm. Chlorhexidine is the workhorse antiseptic in veterinary dermatology and covers the bacteria that colonise broken skin; the antifungal component addresses the yeast that thrives in warm, humid folds and in ears — which matters in India, where humidity keeps both going year-round. Clip the hair around the area if you can, so the spray reaches skin rather than sitting on the coat, and apply twice daily. Keep it away from the eyes and do not let a dog lick a freshly treated patch for ten minutes. The important context: this treats the infection on the surface, not the reason the skin broke down. Recurring hot spots usually mean allergies, fleas or a food sensitivity underneath, and that needs a vet to unpick.",
    variants: [{ title: "100ml", sku: "KUDL-PH-SKINSPRAY-100ML", amount: 499 }],
  },
  {
    title: "KUDL Ear Cleaning Solution with Aloe",
    handle: "kudl-ear-cleaning-solution-aloe",
    petType: "dogs",
    tree: "pharmacy",
    column: "System Wise",
    item: "Eye & ear care",
    brand: "KUDL Pharmacy",
    category: "grooming-health",
    breeds: ALL_BREEDS,
    rating: 4.5,
    reviewCount: 1093,
    image: "prescriptionBottle",
    weight: 200,
    description:
      "A gentle wax-dissolving ear cleaner with salicylic acid, aloe and a mild drying agent, for the routine maintenance of ears that are prone to trouble. Some dogs need this and others never will: a floppy-eared breed, a dog that swims, and any dog with allergic skin disease all have ear canals that stay warm and damp, which is exactly what yeast and bacteria need. A dog's ear canal is L-shaped, which is why wiping the visible part achieves little — the technique is to fill the canal with solution, massage the base of the ear for twenty seconds until you hear it squelch, then let the dog shake and wipe only what comes up onto the flap. Never push a cotton bud down the canal. Use it weekly on a prone dog. Stop and see a vet for head shaking, a bad smell, dark discharge or pain, and never put anything into an ear with a suspected ruptured drum.",
    variants: [
      { title: "100ml", sku: "KUDL-PH-EARCLEAN-100ML", amount: 349 },
      { title: "250ml", sku: "KUDL-PH-EARCLEAN-250ML", amount: 649 },
    ],
  },
  {
    title: "KUDL Joint Care Tablets — Glucosamine & MSM",
    handle: "kudl-joint-care-glucosamine-msm",
    petType: "dogs",
    tree: "pharmacy",
    column: "System Wise",
    item: "Joint care",
    brand: "KUDL Essentials",
    category: "grooming-health",
    breeds: ALL_BREEDS,
    rating: 4.5,
    reviewCount: 1847,
    image: "assortedTablets",
    weight: 220,
    description:
      "Chewable tablets combining glucosamine hydrochloride, chondroitin sulphate, MSM, hyaluronic acid and omega-3, aimed at supporting cartilage and easing the stiffness of early joint wear. They are most commonly started in three situations: a large breed entering middle age, a dog diagnosed with hip or elbow dysplasia, and a dog recovering from a cruciate or other joint surgery. Set expectations honestly — the evidence for joint supplements is mixed rather than conclusive, the effect is modest, and it takes six to eight weeks of daily dosing before any change is apparent, so a fortnight's trial tells you nothing. They are a support, not a painkiller: a dog that is limping, reluctant on stairs or slow to rise is in pain and needs a vet, who can prescribe proper analgesia. The interventions with the largest effect on an arthritic dog remain keeping it lean and giving it regular, controlled, low-impact exercise. Liver-flavoured and dosed by weight.",
    variants: [
      { title: "60 tablets", sku: "KUDL-PH-JOINT-60", amount: 799 },
      { title: "120 tablets", sku: "KUDL-PH-JOINT-120", amount: 1449 },
    ],
  },
  {
    title: "KUDL Liver Support Syrup with Silymarin",
    handle: "kudl-liver-support-syrup-silymarin",
    petType: "dogs",
    tree: "pharmacy",
    column: "System Wise",
    item: "Liver care",
    brand: "KUDL Pharmacy",
    category: "grooming-health",
    breeds: ALL_BREEDS,
    rating: 4.3,
    reviewCount: 486,
    image: "prescriptionBottle",
    weight: 250,
    description:
      "A hepatoprotective syrup built on silymarin from milk thistle, with SAMe, L-ornithine and B vitamins. Silymarin is among the better-studied liver support compounds, acting as an antioxidant that helps protect hepatocytes from oxidative damage and supporting their regeneration; SAMe supports glutathione production, the liver's main internal antioxidant. Vets typically suggest it alongside treatment for raised liver enzymes, for a dog on long-term medication that is metabolised hepatically, during recovery from a toxic insult, and for older dogs with reduced liver function. The framing matters: this is supportive, not curative, and it does not substitute for finding out why the liver is struggling. Liver disease is diagnosed on bloodwork and imaging, and the underlying cause dictates the treatment. Give the measured dose twice daily with food, shake well, refrigerate after opening and use within a month. Start it under veterinary supervision so response can be tracked on repeat bloods.",
    variants: [{ title: "200ml", sku: "KUDL-PH-LIVER-200ML", amount: 699 }],
  },
  {
    title: "KUDL Renal Support Powder for Cats",
    handle: "kudl-renal-support-powder-cats",
    petType: "cats",
    tree: "pharmacy",
    column: "System Wise",
    item: "Kidney care",
    brand: "KUDL Pharmacy",
    category: "grooming-health",
    rating: 4.4,
    reviewCount: 398,
    image: "pillsSpilling",
    weight: 100,
    description:
      "A palatable powder containing a phosphate binder, potassium citrate, B vitamins and omega-3, sprinkled over food for cats with chronic kidney disease. Each part has a job. Controlling phosphate is the intervention with the clearest survival benefit in feline CKD, because a failing kidney cannot excrete phosphate and the excess accelerates further kidney damage. Potassium is added because these cats lose it in urine and run low, which causes weakness. The B vitamins replace what is lost in the increased urine volume. CKD is common in older cats and progressive rather than curable, but it is genuinely manageable — cats diagnosed early and managed well often live for years, and the earliest signs are drinking and urinating noticeably more, gradual weight loss and a poorer coat. Use it alongside a renal diet and free water access, under veterinary supervision: dosing depends on your cat's blood phosphate, so it needs periodic bloodwork rather than a fixed scoop.",
    variants: [{ title: "60 sachets", sku: "KUDL-PH-RENAL-60S", amount: 1299 }],
  },
  {
    title: "KUDL Probiotic Gut Health Paste",
    handle: "kudl-probiotic-gut-health-paste",
    petType: "dogs",
    tree: "pharmacy",
    column: "System Wise",
    item: "Digestive care",
    brand: "KUDL Essentials",
    category: "grooming-health",
    breeds: ALL_BREEDS,
    rating: 4.6,
    reviewCount: 1524,
    image: "prescriptionBottle",
    weight: 60,
    description:
      "A palatable oral paste of live probiotic strains with prebiotic FOS, kaolin and pectin, for the short-lived digestive upsets that are a normal part of living with a dog — a bin raid, a change of food, the loose stools that follow a course of antibiotics, or a stressful kennel stay. The live cultures help repopulate gut flora, the prebiotic feeds them, and the kaolin and pectin adsorb toxins and firm up stool while that happens. Antibiotic-associated diarrhoea is one of the better-evidenced uses, since the drug clears beneficial flora alongside the target bacteria. The syringe format matters in practice: a dog that is off its food will still take a paste from a syringe when it will not eat a supplement mixed into a bowl. Give the graduated dose by weight two or three times a day for up to five days. See a vet for diarrhoea beyond forty-eight hours, blood in the stool, repeated vomiting or a lethargic dog — and much sooner for a puppy, which dehydrates fast.",
    variants: [
      { title: "15ml syringe", sku: "KUDL-PH-PROBIOTIC-15ML", amount: 399 },
      { title: "30ml syringe", sku: "KUDL-PH-PROBIOTIC-30ML", amount: 649 },
    ],
  },

  // ─── Preventive Care ─────────────────────────────────────────────────────
  {
    title: "KUDL Broad-Spectrum Dewormer Tablets for Dogs",
    handle: "kudl-dewormer-tablets-dogs",
    petType: "dogs",
    tree: "pharmacy",
    column: "Preventive Care",
    item: "Dewormers",
    brand: "KUDL Essentials",
    category: "grooming-health",
    breeds: ALL_BREEDS,
    rating: 4.6,
    reviewCount: 2043,
    image: "blisterPacksPile",
    weight: 40,
    description:
      "A palatable broad-spectrum wormer covering roundworm, hookworm, whipworm and tapeworm in a single dose. Routine worming is one of the highest-value, lowest-effort things you do for a dog, and it is as much about the household as the animal: several of these worms are zoonotic, and roundworm eggs shed in a garden stay infective in soil for years, which is why worming matters most in homes with young children. A burden is usually invisible until it is heavy, and by the time you see a pot-bellied puppy, a dull coat, weight loss despite a good appetite, or worms in the stool, it has been building for a while. The usual schedule is every three months for an adult dog, and monthly for a puppy from two weeks to six months, but follow your vet's advice for a dog that scavenges or hunts. Dose strictly by weight — weigh the dog rather than estimating. Give with food, and treat fleas at the same time, since fleas transmit tapeworm.",
    variants: [
      { title: "2 tablets", sku: "KUDL-PH-DEWORM-D2", amount: 279 },
      { title: "4 tablets", sku: "KUDL-PH-DEWORM-D4", amount: 499 },
      { title: "10 tablets", sku: "KUDL-PH-DEWORM-D10", amount: 999 },
    ],
  },

  // ─── Dogs (Pharmacy) ─────────────────────────────────────────────────────
  {
    title: "KUDL Antiseptic Wound Spray with Povidone Iodine",
    handle: "kudl-antiseptic-wound-spray",
    petType: "dogs",
    tree: "pharmacy",
    column: "Dogs (Pharmacy)",
    item: "Wound Care",
    brand: "KUDL Pharmacy",
    category: "grooming-health",
    breeds: ALL_BREEDS,
    rating: 4.5,
    reviewCount: 812,
    image: "dogWithBottle",
    weight: 110,
    description:
      "A non-stinging povidone iodine spray with a bitter agent added to discourage licking, for the minor cuts, grazes, insect bites and post-clipping nicks that come up constantly in a household with a dog. A spray is the right format for a first-aid antiseptic because it reaches an awkward area without pressing a swab into a sore spot, and the bitterant is the part that makes it work in practice — a dog that licks a wound clean of antiseptic and keeps the area wet will delay healing considerably. Clip the surrounding hair if you can, rinse away visible dirt with clean water, then apply two or three times daily and keep the dog distracted for a few minutes. Every home with a dog should have this in the cupboard. It is for minor surface wounds only: a puncture, a bite from another animal, anything gaping or bleeding steadily, anything near an eye, or a wound that looks angry after a day or two needs a vet, not a spray.",
    variants: [{ title: "100ml", sku: "KUDL-PH-WOUNDSPRAY-100ML", amount: 349 }],
  },

  // ─── Cats (Pharmacy) ─────────────────────────────────────────────────────
  {
    title: "KUDL Dental Gel for Cats — Enzymatic",
    handle: "kudl-dental-gel-cats-enzymatic",
    petType: "cats",
    tree: "pharmacy",
    column: "Cats (Pharmacy)",
    item: "Oral Care",
    brand: "KUDL Pharmacy",
    category: "grooming-health",
    rating: 4.1,
    reviewCount: 447,
    image: "pillsInPalm",
    weight: 80,
    description:
      "An enzymatic gel with a poultry flavour, applied to the gum line with a fingertip or a soft brush and left in place — no rinsing, which is the only realistic way to do anything dental with a cat. The enzyme system keeps working on plaque after application, so even a smear that gets partly groomed off has some effect. This is worth the effort because dental disease is the most under-treated common problem in cats: by middle age most cats have some periodontal disease, and it is painful, it is a route for bacteria into the bloodstream, and cats hide it almost completely — they keep eating with a mouth that would have a person in a dentist's chair. Start slowly, a fingertip of gel offered as a treat for several days before you touch a tooth, and aim for daily use on the outer surfaces only. It slows plaque but will not remove hardened tartar; drooling, pawing at the mouth, bad breath or a cat eating on one side needs a veterinary dental.",
    variants: [{ title: "70g", sku: "KUDL-PH-DENTALGEL-70G", amount: 549 }],
  },
]
