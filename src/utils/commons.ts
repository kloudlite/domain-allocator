export const generateNameSuggestions = (baseName:string, count = 10)=> {
    const suffixes = Array.from({ length: count }, () => Math.floor(Math.random() * 9000 + 1000));
  
    const suggestions = suffixes
      .slice(0, count)
      .map(suffix => `${baseName}${suffix}`);
  
    return [baseName,...suggestions];
  }