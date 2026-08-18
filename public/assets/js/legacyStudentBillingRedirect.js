const params=new URLSearchParams(location.search),id=params.get('id');location.replace(`/dashboard/#student-profile${id?`?id=${encodeURIComponent(id)}`:''}`);
