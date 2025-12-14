const {attendance} = require('../models');
exports.createleave =async(req,res)=>{
      try {
            const leave = await Leave.create(req.body);
            res.status(201).json({success:true,data:leave});
      } catch (e) {
        res.status(500).json({success: false,message: e.message});   
      }
};