/* Shared by the progressive form enhancement and isolated validation tests. */
globalThis.YanaiValidation = {
  normalizePhone(value) {
    let phone=String(value || '').normalize('NFKC').replace(/[\u0660-\u0669]/g,c=>String(c.charCodeAt(0)-0x660)).replace(/[\u06f0-\u06f9]/g,c=>String(c.charCodeAt(0)-0x6f0)).replace(/[\u200e\u200f\u202a-\u202e\u2066-\u2069]/g,'').trim();
    // Accept a single trailing plus from RTL copy/paste without reversing digits.
    if (/^[\d\s().-]+\+$/.test(phone)) phone='+'+phone.slice(0,-1).trim();
    return phone.replace(/^00/,'+');
  },
  phoneInfo(value) {
    const phone=this.normalizePhone(value);
    try {
      const parsed=globalThis.libphonenumber.parsePhoneNumberFromString(phone,{defaultCountry:'IL',extract:false});
      if(parsed?.isValid())return {valid:true,formatted:parsed.formatInternational(),country:parsed.country,number:parsed.number,nonGeographic:parsed.isNonGeographic()};
    } catch {}
    return {valid:false};
  },
  validate(data) {
    const errors = {};
    const company = String(data.get('company') || '').trim();
    const phone = this.normalizePhone(data.get('phone'));
    if (!company) errors.company = 'כתבו את שם החברה כדי שנוכל לטפל בפנייה.';
    else if (company.length > 120) errors.company = 'שם החברה יכול להכיל עד 120 תווים.';
    if (!phone) errors.phone = 'מה מספר הטלפון שבו אפשר לחזור אליכם?';
    else if (!this.phoneInfo(phone).valid) errors.phone = 'המספר אינו שלם או שהקידומת אינה תקינה. למספר מחו״ל הוסיפו + וקידומת מדינה.';
    return errors;
  }
};
