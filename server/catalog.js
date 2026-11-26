// Stashify seed catalog. Products use real photography (see uploads/products and
// photo-credits.json). `colors` drive the selectable colour options; the legacy
// `model` field is retained for compatibility but no longer renders anything.

export const CATEGORIES = [
  { id: 'audio', name: 'Audio', icon: 'headphones', blurb: 'Sound you can feel' },
  { id: 'electronics', name: 'Electronics', icon: 'phone', blurb: 'Everyday tech, elevated' },
  { id: 'wearables', name: 'Wearables', icon: 'watch', blurb: 'Time, tracked beautifully' },
  { id: 'gaming', name: 'Gaming', icon: 'controller', blurb: 'Play without limits' },
  { id: 'home', name: 'Home & Living', icon: 'lamp', blurb: 'Rooms with a point of view' },
  { id: 'fashion', name: 'Fashion', icon: 'sneaker', blurb: 'Step into something new' },
  { id: 'fitness', name: 'Fitness', icon: 'bottle', blurb: 'Built for the long run' },
  { id: 'beauty', name: 'Beauty', icon: 'perfume', blurb: 'Small rituals, big mood' }
];

const p = (o) => ({
  rating: 4.5,
  ratingCount: 128,
  stock: 24,
  badges: [],
  highlights: [],
  ...o,
  price: Math.round(o.price),
  mrp: Math.round(o.mrp)
});

export const PRODUCTS = [
  p({
    id: 'aurora-over-ear',
    name: 'Aurora Studio Over-Ear Headphones',
    brand: 'Stashify Audio',
    category: 'audio',
    model: 'headphones',
    price: 8999, mrp: 14999,
    rating: 4.7, ratingCount: 2841,
    colors: [
      { name: 'Deep Navy', hex: '#14213D' },
      { name: 'Warm Cream', hex: '#F4EDE0' },
      { name: 'Coral Pop', hex: '#FF6B5B' }
    ],
    badges: ['Bestseller'],
    tags: ['wireless', 'anc', 'bluetooth', 'music'],
    description: 'Forty hours of playback, hybrid active noise cancellation and memory-foam cups wrapped in vegan leather. Aurora Studio tunes every track the way the artist intended.',
    highlights: ['40h battery, 10min = 6h fast charge', 'Hybrid ANC with transparency mode', 'Multipoint Bluetooth 5.3', 'Foldable aluminium frame'],
    specs: { Driver: '40mm dynamic', Battery: '40 hours (ANC on)', Weight: '268 g', Codec: 'LDAC / AAC / SBC', Warranty: '2 years' }
  }),
  p({
    id: 'pebble-buds',
    name: 'Pebble Buds Pro Wireless Earbuds',
    brand: 'Stashify Audio',
    category: 'audio',
    model: 'earbuds',
    price: 3499, mrp: 6999,
    rating: 4.4, ratingCount: 1520,
    colors: [
      { name: 'Warm Cream', hex: '#F4EDE0' },
      { name: 'Deep Navy', hex: '#14213D' },
      { name: 'Sage', hex: '#8FA98A' }
    ],
    badges: ['Deal'],
    tags: ['earbuds', 'wireless', 'anc'],
    description: 'Feather-light buds with adaptive ANC, spatial audio and a pocketable pebble case that charges on any Qi pad.',
    highlights: ['Adaptive ANC + 6 mics', '32h total with case', 'IPX5 sweat resistant', 'Wireless charging case'],
    specs: { Driver: '11mm', Battery: '8h + 24h case', Weight: '4.6 g per bud', Rating: 'IPX5', Warranty: '1 year' }
  }),
  p({
    id: 'monolith-speaker',
    name: 'Monolith 360° Bluetooth Speaker',
    brand: 'Stashify Audio',
    category: 'audio',
    model: 'speaker',
    price: 5999, mrp: 9499,
    rating: 4.6, ratingCount: 932,
    colors: [
      { name: 'Coral Pop', hex: '#FF6B5B' },
      { name: 'Deep Navy', hex: '#14213D' },
      { name: 'Sand', hex: '#D9C7A7' }
    ],
    tags: ['speaker', 'bluetooth', 'party'],
    description: 'A room-filling 360° driver array in a fabric-wrapped column. Pair two for true stereo, or stack them for a party.',
    highlights: ['360° sound stage', '24h playback', 'IP67 dust + waterproof', 'Stereo pairing'],
    specs: { Output: '40 W', Battery: '24 hours', Weight: '1.1 kg', Rating: 'IP67', Warranty: '2 years' }
  }),
  p({
    id: 'nova-phone',
    name: 'Nova 12 Pro Smartphone (256 GB)',
    brand: 'Nova',
    category: 'electronics',
    model: 'phone',
    price: 42999, mrp: 54999,
    rating: 4.5, ratingCount: 6210,
    colors: [
      { name: 'Deep Navy', hex: '#14213D' },
      { name: 'Coral Pop', hex: '#FF6B5B' },
      { name: 'Titanium', hex: '#B9B4AC' }
    ],
    badges: ['Bestseller'],
    tags: ['phone', 'mobile', 'camera', '5g'],
    description: 'A 6.7" 120Hz LTPO display, triple 50MP camera system and a chip that keeps up with everything you throw at it.',
    highlights: ['6.7" LTPO AMOLED, 120Hz', 'Triple 50MP camera system', '5000mAh, 80W charging', '5 years of OS updates'],
    specs: { Display: '6.7" AMOLED 120Hz', Storage: '256 GB', RAM: '12 GB', Battery: '5000 mAh', Warranty: '1 year' }
  }),
  p({
    id: 'slate-tablet',
    name: 'Slate Air 11" Tablet + Stylus',
    brand: 'Nova',
    category: 'electronics',
    model: 'tablet',
    price: 28999, mrp: 35999,
    rating: 4.3, ratingCount: 811,
    colors: [
      { name: 'Warm Cream', hex: '#F4EDE0' },
      { name: 'Deep Navy', hex: '#14213D' }
    ],
    tags: ['tablet', 'stylus', 'draw'],
    description: 'A laminated 11" canvas with 4096 pressure levels and all-day battery. Sketch, note, binge — it does all three.',
    highlights: ['11" 2.5K laminated display', 'Stylus included, 4096 levels', '12h mixed use', 'Quad speakers'],
    specs: { Display: '11" 2.5K', Storage: '128 GB', RAM: '8 GB', Battery: '8600 mAh', Warranty: '1 year' }
  }),
  p({
    id: 'lumen-laptop',
    name: 'Lumen Book 14 Ultralight Laptop',
    brand: 'Lumen',
    category: 'electronics',
    model: 'laptop',
    price: 74999, mrp: 89999,
    rating: 4.6, ratingCount: 1204,
    colors: [
      { name: 'Deep Navy', hex: '#14213D' },
      { name: 'Titanium', hex: '#B9B4AC' }
    ],
    badges: ['New'],
    tags: ['laptop', 'computer', 'work'],
    description: '1.1 kg of machined aluminium, a 3K OLED panel and 18 hours of real battery. The laptop you forget is in your bag.',
    highlights: ['14" 3K OLED', '18h battery life', '1.1 kg magnesium chassis', 'Backlit low-profile keys'],
    specs: { CPU: '8-core, 4.6 GHz', RAM: '16 GB', Storage: '512 GB NVMe', Weight: '1.1 kg', Warranty: '2 years' }
  }),
  p({
    id: 'orbit-watch',
    name: 'Orbit Smartwatch with AMOLED',
    brand: 'Orbit',
    category: 'wearables',
    model: 'watch',
    price: 6499, mrp: 11999,
    rating: 4.4, ratingCount: 3390,
    colors: [
      { name: 'Coral Pop', hex: '#FF6B5B' },
      { name: 'Deep Navy', hex: '#14213D' },
      { name: 'Warm Cream', hex: '#F4EDE0' }
    ],
    badges: ['Deal', 'Bestseller'],
    tags: ['watch', 'smartwatch', 'fitness', 'health'],
    description: 'A 1.8" always-on AMOLED, dual-band GPS and 14-day battery in a case that weighs less than a coin roll.',
    highlights: ['1.8" always-on AMOLED', '14-day typical battery', 'Dual-band GPS', 'SpO2 + sleep tracking'],
    specs: { Display: '1.8" AMOLED', Battery: '14 days', Water: '5 ATM', Sensors: 'HR, SpO2, GPS', Warranty: '1 year' }
  }),
  p({
    id: 'halo-ring',
    name: 'Halo Sleep & Recovery Ring',
    brand: 'Orbit',
    category: 'wearables',
    model: 'ring',
    price: 12999, mrp: 16999,
    rating: 4.2, ratingCount: 402,
    colors: [
      { name: 'Titanium', hex: '#B9B4AC' },
      { name: 'Deep Navy', hex: '#14213D' }
    ],
    badges: ['New'],
    tags: ['ring', 'sleep', 'health'],
    description: 'Titanium on the outside, seven sensors on the inside. Tracks sleep stages, HRV and readiness without a screen.',
    highlights: ['7-day battery', 'Sleep staging + HRV', 'Titanium, 2.6 g', 'No subscription'],
    specs: { Material: 'Grade-5 titanium', Battery: '7 days', Weight: '2.6 g', Water: '10 ATM', Warranty: '1 year' }
  }),
  p({
    id: 'vector-controller',
    name: 'Vector Pro Wireless Controller',
    brand: 'Vector',
    category: 'gaming',
    model: 'controller',
    price: 4999, mrp: 7499,
    rating: 4.7, ratingCount: 1877,
    colors: [
      { name: 'Deep Navy', hex: '#14213D' },
      { name: 'Coral Pop', hex: '#FF6B5B' },
      { name: 'Warm Cream', hex: '#F4EDE0' }
    ],
    badges: ['Bestseller'],
    tags: ['gaming', 'controller', 'gamepad'],
    description: 'Hall-effect sticks that never drift, four remappable paddles and a 1000Hz wireless link.',
    highlights: ['Hall-effect anti-drift sticks', '4 remappable back paddles', '1000Hz polling', '30h battery'],
    specs: { Connection: '2.4GHz / BT / USB-C', Battery: '30 hours', Weight: '278 g', Compatibility: 'PC, console, mobile', Warranty: '1 year' }
  }),
  p({
    id: 'keystone-keyboard',
    name: 'Keystone 75% Mechanical Keyboard',
    brand: 'Keystone',
    category: 'gaming',
    model: 'keyboard',
    price: 7499, mrp: 10999,
    rating: 4.8, ratingCount: 2210,
    colors: [
      { name: 'Warm Cream', hex: '#F4EDE0' },
      { name: 'Deep Navy', hex: '#14213D' }
    ],
    badges: ['Bestseller'],
    tags: ['keyboard', 'mechanical', 'desk'],
    description: 'Gasket-mounted, hot-swappable and pre-lubed. Sounds like a marble rolling on a wooden desk — in the best way.',
    highlights: ['Gasket mount, 5-layer foam', 'Hot-swap 3/5-pin switches', 'Tri-mode connectivity', 'PBT double-shot keycaps'],
    specs: { Layout: '75% (82 keys)', Switches: 'Linear, pre-lubed', Battery: '4000 mAh', Weight: '980 g', Warranty: '2 years' }
  }),
  p({
    id: 'glide-mouse',
    name: 'Glide Ultralight Wireless Mouse',
    brand: 'Keystone',
    category: 'gaming',
    model: 'mouse',
    price: 3299, mrp: 4999,
    rating: 4.5, ratingCount: 1105,
    colors: [
      { name: 'Warm Cream', hex: '#F4EDE0' },
      { name: 'Coral Pop', hex: '#FF6B5B' },
      { name: 'Deep Navy', hex: '#14213D' }
    ],
    tags: ['mouse', 'gaming', 'desk'],
    description: '49 grams, a 26K sensor and PTFE feet that make your desk feel like ice.',
    highlights: ['49 g ultralight shell', '26,000 DPI sensor', '90h battery', '100% PTFE feet'],
    specs: { Weight: '49 g', Sensor: '26K optical', Battery: '90 hours', Buttons: '6 programmable', Warranty: '2 years' }
  }),
  p({
    id: 'vista-monitor',
    name: 'Vista 27" 4K Creator Monitor',
    brand: 'Vista',
    category: 'electronics',
    model: 'monitor',
    price: 32999, mrp: 41999,
    rating: 4.4, ratingCount: 587,
    colors: [
      { name: 'Deep Navy', hex: '#14213D' },
      { name: 'Titanium', hex: '#B9B4AC' }
    ],
    tags: ['monitor', 'display', 'desk', '4k'],
    description: 'Factory-calibrated 4K with 98% DCI-P3, a single-cable USB-C dock and a stand that actually looks good.',
    highlights: ['27" 4K, 98% DCI-P3', 'Delta-E < 2 calibrated', '96W USB-C single cable', 'Height + pivot adjustable'],
    specs: { Panel: '27" IPS Black', Refresh: '120 Hz', Ports: 'USB-C, 2×HDMI, DP', Warranty: '3 years' }
  }),
  p({
    id: 'ember-lamp',
    name: 'Ember Arc Table Lamp',
    brand: 'Stashify Home',
    category: 'home',
    model: 'lamp',
    price: 3899, mrp: 5999,
    rating: 4.6, ratingCount: 740,
    colors: [
      { name: 'Coral Pop', hex: '#FF6B5B' },
      { name: 'Warm Cream', hex: '#F4EDE0' },
      { name: 'Deep Navy', hex: '#14213D' }
    ],
    badges: ['Deal'],
    tags: ['lamp', 'lighting', 'desk', 'home'],
    description: 'A weighted arc of powder-coated steel with stepless warm-to-cool dimming. Tap the base, set the mood.',
    highlights: ['2700K–5000K stepless dimming', 'Touch base control', 'Memory function', 'USB-C powered'],
    specs: { Output: '450 lumens', CRI: '95+', Material: 'Powder-coated steel', Height: '42 cm', Warranty: '2 years' }
  }),
  p({
    id: 'drift-chair',
    name: 'Drift Ergonomic Task Chair',
    brand: 'Stashify Home',
    category: 'home',
    model: 'chair',
    price: 18999, mrp: 26999,
    rating: 4.5, ratingCount: 431,
    colors: [
      { name: 'Deep Navy', hex: '#14213D' },
      { name: 'Warm Cream', hex: '#F4EDE0' },
      { name: 'Sage', hex: '#8FA98A' }
    ],
    tags: ['chair', 'office', 'furniture', 'desk'],
    description: 'A breathable mesh back, 4D arms and a self-weighing recline that follows you instead of fighting you.',
    highlights: ['Self-weighing recline', '4D adjustable armrests', 'Breathable elastomer mesh', '12-year frame warranty'],
    specs: { 'Weight capacity': '136 kg', Recline: '4 lockable positions', Material: 'Mesh + aluminium', Warranty: '12 years frame' }
  }),
  p({
    id: 'terra-planter',
    name: 'Terra Self-Watering Planter',
    brand: 'Stashify Home',
    category: 'home',
    model: 'planter',
    price: 1799, mrp: 2799,
    rating: 4.3, ratingCount: 296,
    colors: [
      { name: 'Warm Cream', hex: '#F4EDE0' },
      { name: 'Coral Pop', hex: '#FF6B5B' },
      { name: 'Sage', hex: '#8FA98A' }
    ],
    tags: ['planter', 'plants', 'home', 'decor'],
    description: 'A hidden reservoir wicks water for three weeks. The plant thrives, you forget, everyone wins.',
    highlights: ['3-week water reservoir', 'Water level window', 'Root-aerating insert', 'Matte ceramic finish'],
    specs: { Diameter: '18 cm', Reservoir: '1.2 L', Material: 'Glazed ceramic', Warranty: '1 year' }
  }),
  p({
    id: 'stride-sneaker',
    name: 'Stride Everyday Knit Sneakers',
    brand: 'Stride',
    category: 'fashion',
    model: 'sneaker',
    price: 4299, mrp: 6999,
    rating: 4.4, ratingCount: 3120,
    colors: [
      { name: 'Warm Cream', hex: '#F4EDE0' },
      { name: 'Deep Navy', hex: '#14213D' },
      { name: 'Coral Pop', hex: '#FF6B5B' }
    ],
    badges: ['Bestseller'],
    tags: ['shoes', 'sneaker', 'fashion', 'running'],
    description: 'A recycled-knit upper on a nitrogen-infused foam midsole. Machine washable, airport-friendly, all-day kind.',
    highlights: ['Nitrogen-infused foam', 'Recycled knit upper', 'Machine washable', '241 g per shoe'],
    specs: { Upper: 'Recycled PET knit', Midsole: 'N2 supercritical foam', Weight: '241 g (UK 9)', Care: 'Machine wash cold', Warranty: '6 months' }
  }),
  p({
    id: 'atlas-backpack',
    name: 'Atlas 24L Commuter Backpack',
    brand: 'Atlas',
    category: 'fashion',
    model: 'backpack',
    price: 5499, mrp: 8499,
    rating: 4.7, ratingCount: 1642,
    colors: [
      { name: 'Deep Navy', hex: '#14213D' },
      { name: 'Sand', hex: '#D9C7A7' },
      { name: 'Coral Pop', hex: '#FF6B5B' }
    ],
    badges: ['Deal'],
    tags: ['bag', 'backpack', 'travel', 'laptop'],
    description: 'Weatherproof recycled sailcloth, a suspended 16" laptop sleeve and a magnetic top that opens one-handed.',
    highlights: ['Fits 16" laptops', 'Weatherproof sailcloth', 'Magnetic one-hand opening', 'Luggage pass-through'],
    specs: { Volume: '24 L', Material: 'Recycled sailcloth', Laptop: 'Up to 16"', Weight: '1.05 kg', Warranty: 'Lifetime' }
  }),
  p({
    id: 'eclipse-shades',
    name: 'Eclipse Polarised Sunglasses',
    brand: 'Stride',
    category: 'fashion',
    model: 'sunglasses',
    price: 2799, mrp: 4499,
    rating: 4.2, ratingCount: 512,
    colors: [
      { name: 'Deep Navy', hex: '#14213D' },
      { name: 'Coral Pop', hex: '#FF6B5B' },
      { name: 'Sand', hex: '#D9C7A7' }
    ],
    tags: ['sunglasses', 'fashion', 'summer'],
    description: 'Bio-acetate frames with polarised CR-39 lenses and spring hinges that survive being sat on. Mostly.',
    highlights: ['Polarised, UV400', 'Bio-acetate frame', 'Spring hinges', 'Hard case included'],
    specs: { Lens: 'Polarised CR-39', Frame: 'Bio-acetate', UV: 'UV400', Weight: '28 g', Warranty: '1 year' }
  }),
  p({
    id: 'summit-bottle',
    name: 'Summit 1L Insulated Bottle',
    brand: 'Summit',
    category: 'fitness',
    model: 'bottle',
    price: 1999, mrp: 2999,
    rating: 4.6, ratingCount: 2033,
    colors: [
      { name: 'Coral Pop', hex: '#FF6B5B' },
      { name: 'Deep Navy', hex: '#14213D' },
      { name: 'Warm Cream', hex: '#F4EDE0' }
    ],
    badges: ['Deal'],
    tags: ['bottle', 'fitness', 'gym', 'travel'],
    description: 'Double-walled steel that keeps ice for 24 hours and heat for 12, with a lid you can open with one finger.',
    highlights: ['24h cold / 12h hot', 'One-finger flip lid', 'Fits car cup holders', '18/8 stainless steel'],
    specs: { Capacity: '1 L', Material: '18/8 steel', Weight: '420 g', Care: 'Hand wash', Warranty: 'Lifetime' }
  }),
  p({
    id: 'core-mat',
    name: 'Core Alignment Yoga Mat',
    brand: 'Summit',
    category: 'fitness',
    model: 'mat',
    price: 2499, mrp: 3999,
    rating: 4.5, ratingCount: 864,
    colors: [
      { name: 'Sage', hex: '#8FA98A' },
      { name: 'Deep Navy', hex: '#14213D' },
      { name: 'Coral Pop', hex: '#FF6B5B' }
    ],
    tags: ['yoga', 'mat', 'fitness'],
    description: 'Natural rubber with laser-etched alignment lines and a grip that gets better the sweatier it gets.',
    highlights: ['Natural tree rubber', 'Alignment guide lines', '4.5mm joint cushioning', 'Carry strap included'],
    specs: { Size: '183 × 66 cm', Thickness: '4.5 mm', Material: 'Natural rubber + PU', Weight: '2.4 kg', Warranty: '1 year' }
  }),
  p({
    id: 'pulse-dumbbell',
    name: 'Pulse Adjustable Dumbbell (Pair)',
    brand: 'Summit',
    category: 'fitness',
    model: 'dumbbell',
    price: 14999, mrp: 21999,
    rating: 4.4, ratingCount: 389,
    colors: [
      { name: 'Deep Navy', hex: '#14213D' },
      { name: 'Coral Pop', hex: '#FF6B5B' }
    ],
    tags: ['dumbbell', 'gym', 'strength', 'fitness'],
    description: 'Twist the handle to dial 2–24 kg per hand. Sixteen pairs of dumbbells hiding inside one.',
    highlights: ['2–24 kg per hand', 'Twist-dial selection', 'Compact cradles included', 'Steel-on-steel plates'],
    specs: { Range: '2–24 kg each', Increments: '2 kg', Material: 'Steel + nylon', Warranty: '2 years' }
  }),
  p({
    id: 'sable-perfume',
    name: 'Sable Eau de Parfum, 50 ml',
    brand: 'Sable',
    category: 'beauty',
    model: 'perfume',
    price: 3499, mrp: 4999,
    rating: 4.5, ratingCount: 671,
    colors: [
      { name: 'Coral Pop', hex: '#FF6B5B' },
      { name: 'Warm Cream', hex: '#F4EDE0' },
      { name: 'Deep Navy', hex: '#14213D' }
    ],
    badges: ['New'],
    tags: ['perfume', 'fragrance', 'beauty'],
    description: 'Bergamot and pink pepper up top, fig leaf in the middle, warm cedar and amber at the base. Lasts a full day.',
    highlights: ['Top: bergamot, pink pepper', 'Heart: fig leaf, neroli', 'Base: cedar, amber', '12-hour wear'],
    specs: { Volume: '50 ml', Concentration: 'Eau de Parfum', Family: 'Woody citrus', Cruelty_free: 'Yes', Warranty: 'NA' }
  }),
  p({
    id: 'ritual-serum',
    name: 'Ritual 10% Vitamin C Serum',
    brand: 'Sable',
    category: 'beauty',
    model: 'serum',
    price: 1299, mrp: 1999,
    rating: 4.3, ratingCount: 1488,
    colors: [
      { name: 'Warm Cream', hex: '#F4EDE0' },
      { name: 'Coral Pop', hex: '#FF6B5B' }
    ],
    tags: ['serum', 'skincare', 'beauty'],
    description: 'Stabilised 10% vitamin C with ferulic acid in an airless pump that keeps the last drop as fresh as the first.',
    highlights: ['10% stabilised vitamin C', 'Ferulic + vitamin E', 'Airless UV-block pump', 'Fragrance free'],
    specs: { Volume: '30 ml', 'Key actives': '10% THD ascorbate', pH: '5.5', Fragrance: 'None', Warranty: 'NA' }
  }),
  p({
    id: 'nomad-camera',
    name: 'Nomad Mirrorless Camera Kit',
    brand: 'Nomad',
    category: 'electronics',
    model: 'camera',
    price: 68999, mrp: 82999,
    rating: 4.8, ratingCount: 943,
    colors: [
      { name: 'Deep Navy', hex: '#14213D' },
      { name: 'Titanium', hex: '#B9B4AC' }
    ],
    badges: ['Bestseller'],
    tags: ['camera', 'photography', 'video'],
    description: 'A 26MP back-illuminated sensor, 7-stop stabilisation and 6K open-gate video in a body that fits one hand.',
    highlights: ['26MP BSI sensor', '7-stop IBIS', '6K open-gate video', 'Weather-sealed body'],
    specs: { Sensor: '26MP APS-C BSI', Video: '6K/30, 4K/120', Mount: 'N-mount', Weight: '523 g', Warranty: '2 years' }
  })
];

export const COUPONS = [
  { code: 'STASH10', type: 'percent', value: 10, maxDiscount: 1500, minSubtotal: 999, label: '10% off up to ₹1,500' },
  { code: 'CORAL500', type: 'flat', value: 500, minSubtotal: 3999, label: '₹500 off orders over ₹3,999' },
  { code: 'FIRST15', type: 'percent', value: 15, maxDiscount: 3000, minSubtotal: 1999, label: '15% off up to ₹3,000' }
];

export function findProduct(id) {
  return PRODUCTS.find((x) => x.id === id);
}
