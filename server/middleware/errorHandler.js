export function notFound(req,res){res.status(404).json({success:false,message:'Resource not found',errors:[]})}
export function errorHandler(error,req,res,next){
  if(res.headersSent)return next(error);
  const context={route:`${req.method} ${req.originalUrl}`,userId:req.user?.id,error:error.message,code:error.code};
  if(error.keyPattern)context.duplicateKeyPattern=error.keyPattern;
  console.error('[API error]',context);
  if(error.code===11000)return res.status(409).json({success:false,message:'A duplicate payment value was detected.',duplicateFields:Object.keys(error.keyPattern||{}),errors:[]});
  const status=error.status||error.statusCode||500,message=status===500&&process.env.NODE_ENV==='production'?'The server could not complete this request. Please try again.':error.message;
  res.status(status).json({success:false,message,errors:error.errors||[]});
}
