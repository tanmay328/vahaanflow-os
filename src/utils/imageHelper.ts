const AVAILABLE_LOCAL_IMAGES = [
  'bmw_z4_red_1791026030834.jpg',
  'commercial_van_fleet_1790847677500.jpg',
  'force_urbania_van_1791025621572.jpg',
  'hyundai_ioniq5_gold_1791026045021.jpg',
  'innova_fleet_white_1790848395872.jpg',
  'kia_carnival_black_1791026080768.jpg',
  'luxury_sedan_black_1790848433946.jpg',
  'mahindra_scorpio_n_1791025607092.jpg',
  'mahindra_thar_black_1791025566221.jpg',
  'maruti_jimny_yellow_1791026067748.jpg',
  'mercedes_e_class_1791025594533.jpg',
  'nexon_ev_blue_1790848422140.jpg',
  'sedan_luxury_ev_1790847641852.jpg',
  'sports_car_cabrio_1790847664522.jpg',
  'suv_premium_black_1790847653822.jpg',
  'tata_nexon_ev_1791025578720.jpg',
  'thar_suv_black_1790848409695.jpg',
  'toyota_hilux_pickup_1791026055660.jpg',
  'toyota_innova_hycross_1791025553936.jpg',
  'upload_vehicle_photo_1791278597476.jpg'
];

export const cleanImageUrl = (url: string | undefined): string => {
  if (!url) return '/images/toyota_innova_hycross_1791025553936.jpg'; // default fallback

  // Extract filename from the URL/path
  const parts = url.split('/');
  const filename = parts[parts.length - 1];

  // If the filename matches any of our known local public images, return its correct path
  if (filename && AVAILABLE_LOCAL_IMAGES.includes(filename)) {
    return `/images/${filename}`;
  }

  // Handle older source paths or standard replacements
  if (url.startsWith('/src/assets/images/')) {
    return url.replace('/src/assets/images/', '/images/');
  }
  if (url.startsWith('/src/assets/')) {
    return url.replace('/src/assets/', '/images/');
  }
  if (url.startsWith('/assets/')) {
    return url.replace('/assets/', '/images/');
  }
  if (url.startsWith('src/assets/')) {
    return '/' + url.replace('src/assets/', 'images/');
  }

  return url;
};

export const getCarGallery = (vehicle: any): string[] => {
  if (!vehicle) return [];
  const list: string[] = [vehicle.image];
  if (vehicle.gallery && Array.isArray(vehicle.gallery)) {
    vehicle.gallery.forEach((img: string) => {
      if (img && !list.includes(img)) list.push(img);
    });
  }

  // If the cover photo is the placeholder, do NOT append anything
  if (vehicle.image && (vehicle.image.includes('upload_car_placeholder') || vehicle.image.includes('upload_vehicle_photo'))) {
    return list;
  }

  // If there are custom gallery images already uploaded, do NOT append random images
  if (vehicle.gallery && vehicle.gallery.length > 0) {
    return list;
  }

  // If it's a default/preset car, we can keep the cohesive mock gallery so it looks beautiful and functional for demo cars
  const isPresetCar = [
    'nexon_ev_blue', 'suv_premium_black', 'luxury_sedan_black', 
    'mahindra_thar_black', 'sedan_luxury_ev', 'toyota_innova_hycross',
    'bmw_z4_red', 'force_urbania_van', 'kia_carnival_black', 'maruti_jimny_yellow'
  ].some(keyword => vehicle.image && vehicle.image.includes(keyword));

  if (!isPresetCar) {
    // If it's a newly added custom car (not preset), do NOT append random images from other car categories!
    return list;
  }

  // Model-specific and cohesive photo sets ensuring all photos match the exact car type and color theme
  const category = (vehicle.category || 'SUV').toUpperCase();
  const model = (vehicle.model || '').toLowerCase();
  const make = (vehicle.make || '').toLowerCase();
  const fuel = (vehicle.fuelType || 'Petrol').toUpperCase();

  if (fuel === 'ELECTRIC' || category.includes('EV') || model.includes('nexon') || model.includes('ev')) {
    // Cohesive Teal/Blue Modern Electric Compact SUV Set
    const evAngles = [
      '/images/tata_nexon_ev_1791025578720.jpg', // Front angle teal
      '/images/nexon_ev_blue_1790848422140.jpg', // Front charging blue
      'https://images.unsplash.com/photo-1563720223185-11003d516935?auto=format&fit=crop&w=600&q=80', // Electric charging closeup (teal/blue)
      'https://images.unsplash.com/photo-1617814076367-b759c7d7e738?auto=format&fit=crop&w=600&q=80', // Compact EV digital cockpit
      'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&w=600&q=80', // EV dashboard & steering cockpit
    ];
    evAngles.forEach(img => {
      if (list.length < 5 && !list.includes(img)) list.push(img);
    });
  } else if (model.includes('thar') || model.includes('jimny') || category.includes('OFF-ROADER') || category.includes('PICKUP')) {
    // Cohesive Black Rugged Off-Roader 4x4 Set
    const offRoadAngles = [
      '/images/mahindra_thar_black_1791025566221.jpg', // Black Thar front angle
      '/images/thar_suv_black_1790848409695.jpg', // Black Thar side profile
      'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&w=600&q=80', // 4x4 Off-roader climbing rocks trail
      'https://images.unsplash.com/photo-1506015391300-4802dc74de2e?auto=format&fit=crop&w=600&q=80', // Offroad rugged wheels & side stance
      'https://images.unsplash.com/photo-1606016159991-dfe4f2746ad5?auto=format&fit=crop&w=600&q=80', // 4x4 Rugged steering cabin interior
    ];
    offRoadAngles.forEach(img => {
      if (list.length < 5 && !list.includes(img)) list.push(img);
    });
  } else if (model.includes('xuv700') || model.includes('scorpio') || category.includes('SUV')) {
    // Cohesive White/Dark Premium Midsize SUV Stance Set
    const suvAngles = [
      '/images/suv_premium_black_1790847653822.jpg', // SUV Front premium stance
      '/images/mahindra_scorpio_n_1791025607092.jpg', // Midsize SUV angle
      'https://images.unsplash.com/photo-1502877338535-766e1452684a?auto=format&fit=crop&w=600&q=80', // Premium family SUV side profile
      'https://images.unsplash.com/photo-1618843479313-40f8afb4b4d8?auto=format&fit=crop&w=600&q=80', // Premium SUV double-pane panoramic sunroof
      'https://images.unsplash.com/photo-1617814076367-b759c7d7e738?auto=format&fit=crop&w=600&q=80', // Premium SUV infotainment display dashboard
    ];
    suvAngles.forEach(img => {
      if (list.length < 5 && !list.includes(img)) list.push(img);
    });
  } else if (model.includes('innova') || model.includes('carnival') || model.includes('urbania') || category.includes('MPV') || category.includes('VAN')) {
    // Cohesive Luxury Family MPV Captain Seat Set
    const mpvAngles = [
      '/images/toyota_innova_hycross_1791025553936.jpg', // Silver Hycross front angle
      '/images/innova_fleet_white_1790848395872.jpg', // MPV side profile
      'https://images.unsplash.com/photo-1541899481282-d53bffe3c35d?auto=format&fit=crop&w=600&q=80', // Family MPV highway side stance
      'https://images.unsplash.com/photo-1562620644-66bd3279c670?auto=format&fit=crop&w=600&q=80', // Luxurious captain recline seats interior cabin
      'https://images.unsplash.com/photo-1580273916550-e323be2ae537?auto=format&fit=crop&w=600&q=80', // MPV front dash center console layout
    ];
    mpvAngles.forEach(img => {
      if (list.length < 5 && !list.includes(img)) list.push(img);
    });
  } else {
    // Cohesive Premium Executive Sedan Set
    const sedanAngles = [
      '/images/sedan_luxury_ev_1790847641852.jpg', // Executive Sedan front angle
      '/images/luxury_sedan_black_1790848433946.jpg', // Executive Sedan side profile
      'https://images.unsplash.com/photo-1555215695-3004980ad54e?auto=format&fit=crop&w=600&q=80', // Premium German sedan highway side
      'https://images.unsplash.com/photo-1616422285623-13ff0162193c?auto=format&fit=crop&w=600&q=80', // Executive Sedan leather cockpit and steering wheel
      'https://images.unsplash.com/photo-1606577924006-27d39b132ae2?auto=format&fit=crop&w=600&q=80', // Executive Sedan rear passenger room & premium armrest
    ];
    sedanAngles.forEach(img => {
      if (list.length < 5 && !list.includes(img)) list.push(img);
    });
  }

  return list.slice(0, 5);
}; // Return up to 5 beautiful, distinct images from different angles & interiors
