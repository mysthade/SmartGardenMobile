export interface WeatherCodeInfo {
  code: number;
  label: string;
  emoji: string;
  iconName: 'sun' | 'cloud' | 'cloud-sun' | 'cloud-rain' | 'cloud-drizzle' | 'cloud-snow' | 'cloud-lightning' | 'cloud-fog';
  color: string;
}

export function getWeatherCodeInfo(code: number, isDay = true): WeatherCodeInfo {
  switch (code) {
    case 0:
      return {
        code,
        label: isDay ? 'Ясно' : 'Ясна ніч',
        emoji: isDay ? '☀️' : '🌙',
        iconName: isDay ? 'sun' : 'cloud-sun',
        color: '#F39C12',
      };
    case 1:
      return {
        code,
        label: 'Здебільшого ясно',
        emoji: isDay ? '🌤️' : '☁️',
        iconName: 'cloud-sun',
        color: '#F1C40F',
      };
    case 2:
      return {
        code,
        label: 'Мінлива хмарність',
        emoji: '⛅',
        iconName: 'cloud-sun',
        color: '#7F8C8D',
      };
    case 3:
      return {
        code,
        label: 'Похмуро',
        emoji: '☁️',
        iconName: 'cloud',
        color: '#95A5A6',
      };
    case 45:
    case 48:
      return {
        code,
        label: code === 48 ? 'Паморозь' : 'Туман',
        emoji: '🌫️',
        iconName: 'cloud-fog',
        color: '#BDC3C7',
      };
    case 51:
    case 53:
    case 55:
      return {
        code,
        label: code === 55 ? 'Густа мряка' : 'Мряка',
        emoji: '🌦️',
        iconName: 'cloud-drizzle',
        color: '#3498DB',
      };
    case 56:
    case 57:
      return {
        code,
        label: 'Крижана мряка',
        emoji: '🌧️',
        iconName: 'cloud-snow',
        color: '#2980B9',
      };
    case 61:
      return {
        code,
        label: 'Невеликий дощ',
        emoji: '🌦️',
        iconName: 'cloud-rain',
        color: '#2980B9',
      };
    case 63:
      return {
        code,
        label: 'Помірний дощ',
        emoji: '🌧️',
        iconName: 'cloud-rain',
        color: '#1F618D',
      };
    case 65:
      return {
        code,
        label: 'Сильний дощ',
        emoji: '⛈️',
        iconName: 'cloud-rain',
        color: '#1B4F72',
      };
    case 66:
    case 67:
      return {
        code,
        label: 'Крижаний дощ',
        emoji: '❄️',
        iconName: 'cloud-snow',
        color: '#5DADE2',
      };
    case 71:
      return {
        code,
        label: 'Невеликий сніг',
        emoji: '🌨️',
        iconName: 'cloud-snow',
        color: '#85C1E9',
      };
    case 73:
    case 75:
      return {
        code,
        label: code === 75 ? 'Сильний снігопад' : 'Снігопад',
        emoji: '❄️',
        iconName: 'cloud-snow',
        color: '#A9CCE3',
      };
    case 77:
      return {
        code,
        label: 'Снігова крупа',
        emoji: '🌨️',
        iconName: 'cloud-snow',
        color: '#85C1E9',
      };
    case 80:
    case 81:
    case 82:
      return {
        code,
        label: code === 82 ? 'Шквальна злива' : 'Злива',
        emoji: '🌧️',
        iconName: 'cloud-rain',
        color: '#2471A3',
      };
    case 85:
    case 86:
      return {
        code,
        label: 'Снігова хуртовина',
        emoji: '🌨️',
        iconName: 'cloud-snow',
        color: '#7FB3D5',
      };
    case 95:
      return {
        code,
        label: 'Гроза',
        emoji: '⛈️',
        iconName: 'cloud-lightning',
        color: '#8E44AD',
      };
    case 96:
    case 99:
      return {
        code,
        label: 'Гроза з градом',
        emoji: '⛈️',
        iconName: 'cloud-lightning',
        color: '#6C3483',
      };
    default:
      return {
        code,
        label: 'Мінлива погода',
        emoji: '🌤️',
        iconName: 'cloud-sun',
        color: '#F39C12',
      };
  }
}
