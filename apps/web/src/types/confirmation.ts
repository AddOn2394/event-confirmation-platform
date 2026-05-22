export interface Client {
  id?: string;
  email: string;
  first_name: string;
  last_name: string;
  phone: string | null;
  document_type?: string | null;
  document_number?: string | null;
}

export interface EventSlot {
  id: string;
  label: string;
  starts_at: string;
  ends_at: string;
}

export interface ConfirmationItem {
  item_id: string;
  name: string;
  type: 'servicio' | 'producto';
  price_at_confirmation: number;
}

export interface ConfirmationDetail {
  id: string;
  created_at: string;
  slot: EventSlot | null;
  items: ConfirmationItem[];
  discount_services: number;
  discount_products: number;
  final_total: number;
}

export interface ConfirmationPageData {
  client: Client;
  existing_confirmation: ConfirmationDetail;
}
