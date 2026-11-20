export const CLINIC_NAME = "Dr Rangarao Skin and Diabetic Care Center";
export const HOME_TITLE = "Skin & Diabetes Care in Chintamani";

export function telephoneHref(phone: string) {
  const number = phone.replace(/[^\d+]/g, "");
  return "tel:" + (/^[6-9]\d{9}$/.test(number) ? "+91" + number : number);
}

export function directionsHref(address: string) {
  return "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(address);
}

export function siteUrl() {
  return new URL(process.env.APP_URL || "http://localhost:3000");
}
