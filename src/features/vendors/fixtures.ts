import type {VendorsListViewModel, VendorListItem} from './types';

const vendors: Omit<VendorListItem, 'lifecycleStatus' | 'status' | 'documentCount' | 'documentTarget' | 'nextExpiry'>[] = [
  {id: 'construct-pro', name: 'Construct Pro SRL', registrationNumber: 'RO12345678', contactName: 'Ion Popescu', category: 'construction'},
  {id: 'global-clean', name: 'Global Clean Services', registrationNumber: 'RO87654321', contactName: 'Elena Marin', category: 'cleaning'},
  {id: 'tech-solutions', name: 'Tech Solutions SRL', registrationNumber: 'RO11223344', contactName: 'Radu Popa', category: 'software'},
  {id: 'build-more', name: 'Build & More SRL', registrationNumber: 'RO99887766', contactName: 'Ioana Dobre', category: 'materials'},
  {id: 'logistics-expert', name: 'Logistics Expert', registrationNumber: 'RO55667788', contactName: 'Andrei Matei', category: 'logistics'},
  {id: 'green-energy', name: 'Green Energy SRL', registrationNumber: 'RO33445566', contactName: 'Maria Stan', category: 'energy'},
  {id: 'food-supplies', name: 'Food Supplies SRL', registrationNumber: 'RO77889900', contactName: 'Sorin Munteanu', category: 'food'},
  {id: 'medical-supplies', name: 'Medical Supplies', registrationNumber: 'RO44556677', contactName: 'Ana Tudor', category: 'medical'},
  {id: 'alpha-construction', name: 'Alpha Construction SRL', registrationNumber: 'RO21436587', category: 'construction'},
  {id: 'nordic-software', name: 'Nordic Software SRL', registrationNumber: 'RO31245678', category: 'software'},
  {id: 'urban-logistics', name: 'Urban Logistics SRL', registrationNumber: 'RO42356789', category: 'logistics'},
  {id: 'eco-clean', name: 'Eco Clean Team SRL', registrationNumber: 'RO53467890', category: 'cleaning'},
  {id: 'terra-materials', name: 'Terra Materials SRL', registrationNumber: 'RO64578901', category: 'materials'},
  {id: 'solar-partners', name: 'Solar Partners SRL', registrationNumber: 'RO75689012', category: 'energy'},
  {id: 'fresh-food', name: 'Fresh Food Distribution', registrationNumber: 'RO86790123', category: 'food'},
  {id: 'medica-plus', name: 'Medica Plus SRL', registrationNumber: 'RO97801234', category: 'medical'},
  {id: 'delta-construct', name: 'Delta Construct SRL', registrationNumber: 'RO18912345', category: 'construction'},
  {id: 'digital-works', name: 'Digital Works SRL', registrationNumber: 'RO29023456', category: 'software'},
  {id: 'rapid-cargo', name: 'Rapid Cargo SRL', registrationNumber: 'RO30134567', category: 'logistics'},
  {id: 'prime-clean', name: 'Prime Clean SRL', registrationNumber: 'RO41245679', category: 'cleaning'},
  {id: 'nova-energy', name: 'Nova Energy SRL', registrationNumber: 'RO52356780', category: 'energy'},
  {id: 'artisan-food', name: 'Artisan Food SRL', registrationNumber: 'RO63467891', category: 'food'},
  {id: 'clinic-equip', name: 'Clinic Equipment SRL', registrationNumber: 'RO74578902', category: 'medical'},
  {id: 'steel-supply', name: 'Steel Supply SRL', registrationNumber: 'RO85689013', category: 'materials'}
];

export const vendorsListFixture: VendorsListViewModel = {
  user: {fullName: 'Andrei Popescu', initials: 'AP'},
  organization: {name: 'Demo Company SRL'},
  notificationCount: 3,
  vendors: vendors.map((vendor) => ({...vendor, lifecycleStatus: 'active', status: 'attention', documentCount: 0, documentTarget: 0, nextExpiry: {date: null, ro: '—', en: '—', tone: 'neutral'}}))
};
