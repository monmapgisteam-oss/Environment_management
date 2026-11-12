// One report location as the company maps draw it.
export type CompanyPoint = {
  id: string;
  lat: number;
  lng: number;
  company: string;
  register: string;
  reportNumber: string;
  reportType: string;
  location: string;
  status: string;
  score: number | null;
  province?: string;
  district?: string;
};
