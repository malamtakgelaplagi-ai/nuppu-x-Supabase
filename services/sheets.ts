
/**
 * SERVICE: Google Sheets Integration (Separated Databases)
 */

// URL DATABASE PENGGUNA (Ganti dengan URL hasil deploy script khusus spreadsheet USER Anda)
const SECURITY_WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbzLjx0tS4ea5QXMIo3PWjcwoQokIP3C1Yrnz0ig44mUipv8MnMgujAlAXYM009qRAU/exec';

const STORAGE_URL = 'https://script.google.com/macros/s/AKfycby0gY6jR87hOmJCxdVNqeFrRw0FVshYHlNyf6i0nvxGBd_bnj7b6QvPMna4gWTc3ILH/exec';

export const getWebAppUrl = () => (localStorage.getItem(STORAGE_URL) || '').trim();
export const saveWebAppUrl = (url: string) => localStorage.setItem(STORAGE_URL, url.trim());

/**
 * Fetch data from specific database
 */
export const fetchSheetsData = async (type: 'OPERATIONAL' | 'SECURITY' = 'OPERATIONAL') => {
  // Gunakan URL hardcoded jika tipenya SECURITY, jika tidak ambil dari localStorage
  const url = type === 'SECURITY' ? SECURITY_WEB_APP_URL : getWebAppUrl();
  
  if (!url || !url.startsWith('https://script.google.com')) {
    if (type === 'SECURITY') console.error("URL Keamanan belum dikonfigurasi di koding!");
    return { error: 'NOT_CONFIGURED' };
  }

  try {
    const fetchUrl = `${url}${url.includes('?') ? '&' : '?'}t=${Date.now()}`;
    const response = await fetch(fetchUrl, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
      redirect: 'follow'
    });

    if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);
    const result = await response.json();
    
    // Pastikan kembalian sesuai dengan permintaan
    if (type === 'SECURITY') {
      return { Pengguna: result.Pengguna || [] };
    }
    
    return result;
  } catch (error) {
    console.error(`Fetch Error [${type}]:`, error);
    return null;
  }
};

/**
 * Master POST request
 */
const postToSheet = async (payload: any) => {
  // Jika sheet yang diakses adalah 'Pengguna', gunakan URL Keamanan
  const url = payload.sheet === 'Pengguna' ? SECURITY_WEB_APP_URL : getWebAppUrl();
  
  if (!url) return false;

  try {
    await fetch(url, {
      method: 'POST',
      mode: 'no-cors',
      cache: 'no-cache',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify(payload),
    });
    return true;
  } catch (error) {
    console.error(`Gagal ${payload.action} di sheet ${payload.sheet}:`, error);
    return false;
  }
};

export const addSheetRow = async (sheetName: string, rowData: any) => {
  return postToSheet({
    action: 'add',
    sheet: sheetName,
    data: { ...rowData, id: rowData.id || `ID-${Date.now()}` }
  });
};

export const updateSheetRow = async (sheetName: string, id: string, updatedData: any) => {
  return postToSheet({
    action: 'update',
    sheet: sheetName,
    data: { ...updatedData, id: id }
  });
};

export const deleteSheetRow = async (sheetName: string, id: string) => {
  return postToSheet({
    action: 'delete',
    sheet: sheetName,
    data: { id: id }
  });
};

export const fetchAllSheetsData = () => fetchSheetsData('OPERATIONAL');
