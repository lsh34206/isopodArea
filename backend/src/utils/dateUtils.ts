export class DateUtils {
    
    static now_date() {
      const now = new Date();
  const date = `${now.getFullYear()}-${now.getMonth()+1}-${now.getDate()} ${now.getHours()}:${now.getMinutes()}:${now.getSeconds()}`;
  return date;
      }
      
      static date_to_string(date) {
         const datee = new Date(date); 
      const date_string = `${datee.getFullYear()}-${datee.getMonth()+1}-${datee.getDate()} ${datee.getHours()}:${datee.getMinutes()}:${datee.getSeconds()}`;
  
      return date_string;
  }
  
  }