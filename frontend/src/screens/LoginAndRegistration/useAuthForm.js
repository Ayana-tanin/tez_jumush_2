import { useState, useCallback } from 'react';

export const useAuthForm = () => {
  const [formData, setFormData] = useState({
    fullName: '',
    passportSeries: '',
    passportNumber: '',
    passportIssuedBy: '',
    passportDate: '',
  });

  const [agreementAccepted, setAgreementAccepted] = useState(false);

  const handleInputChange = useCallback((field, value) => {
    let cleanValue = value;
    
    if (field === 'passportSeries' || field === 'passportNumber') {
      // Только цифры для серии и номера паспорта
      cleanValue = value.replace(/\D/g, '');
    } else if (field === 'passportDate') {
      // Форматирование даты ДД.ММ.ГГГГ
      cleanValue = value.replace(/\D/g, '');
      if (cleanValue.length >= 2) {
        cleanValue = cleanValue.substring(0, 2) + '.' + cleanValue.substring(2);
      }
      if (cleanValue.length >= 5) {
        cleanValue = cleanValue.substring(0, 5) + '.' + cleanValue.substring(5, 9);
      }
    }
    
    setFormData(prev => ({
      ...prev,
      [field]: cleanValue,
    }));
  }, []);

  const validatePassportData = useCallback(() => {
    const errors = [];

    if (!formData.fullName.trim()) {
      errors.push('Введите ФИО');
    }

    if (!formData.passportSeries.trim()) {
      errors.push('Введите серию паспорта');
    } else if (!/^\d{7}$/.test(formData.passportSeries)) {
      errors.push('Серия паспорта должна содержать ровно 7 цифр');
    }

    if (!formData.passportNumber.trim()) {
      errors.push('Введите ИНН');
    } else if (!/^\d{14}$/.test(formData.passportNumber)) {
      errors.push('ИНН должен содержать ровно 14 цифр');
    }

    if (!formData.passportIssuedBy.trim()) {
      errors.push('Введите кем выдан паспорт');
    } else if (formData.passportIssuedBy.length > 11) {
      errors.push('Кем выдан не должен превышать 11 символов');
    }

    if (!formData.passportDate.trim()) {
      errors.push('Введите дату выдачи паспорта');
    } else if (!/^\d{2}\.\d{2}\.\d{4}$/.test(formData.passportDate)) {
      errors.push('Дата должна быть в формате ДД.ММ.ГГГГ');
    } else {
      // Дополнительная валидация даты
      const [day, month, year] = formData.passportDate.split('.').map(Number);
      const date = new Date(year, month - 1, day);
      const now = new Date();
      
      if (date.getDate() !== day || date.getMonth() !== month - 1 || date.getFullYear() !== year) {
        errors.push('Введите корректную дату');
      } else if (date > now) {
        errors.push('Дата выдачи не может быть в будущем');
      } else if (year < 1990) {
        errors.push('Дата выдачи слишком старая');
      }
    }

    return errors;
  }, [formData]);

  const isFormValid = useCallback(() => {
    return (
      agreementAccepted &&
      formData.fullName.trim() &&
      formData.passportSeries.trim() &&
      formData.passportNumber.trim() &&
      formData.passportIssuedBy.trim() &&
      formData.passportDate.trim() &&
      validatePassportData().length === 0
    );
  }, [formData, agreementAccepted, validatePassportData]);

  return {
    formData,
    agreementAccepted,
    setAgreementAccepted,
    handleInputChange,
    validatePassportData,
    isFormValid,
  };
};