export const ok=(res,message,data={},status=200)=>res.status(status).json({success:true,message,data});
export const fail=(res,message,errors=[],status=400)=>res.status(status).json({success:false,message,errors});
