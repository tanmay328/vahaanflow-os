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
  'toyota_innova_hycross_1791025553936.jpg'
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
