const Batch = require('../models/Batch');
const Product = require('../models/Product');
const StockTransaction = require('../models/StockTransaction');
const mongoose = require('mongoose');

const getStats = async (req, res) => {
  try {
    const orgId = new mongoose.Types.ObjectId(req.user.orgId);
    const now = new Date(); const d30 = new Date(now); d30.setDate(d30.getDate()-30);
    const d30f = new Date(now); d30f.setDate(d30f.getDate()+30);

    const stockByLocation = await Batch.aggregate([
      { $match: { orgId, qty: { $gt: 0 } } },
      { $lookup: { from:'products', localField:'productId', foreignField:'_id', as:'product' } },
      { $unwind: '$product' },
      { $group: { _id:'$locationId', totalValue: { $sum: { $multiply:['$qty',{ $ifNull:['$product.price',0] }] } }, totalQty:{ $sum:'$qty' }, count:{ $sum:1 } } },
      { $lookup: { from:'locations', localField:'_id', foreignField:'_id', as:'location' } },
      { $unwind: '$location' },
      { $project: { name:'$location.name', value:'$totalValue', count:1, totalQty:1 } }
    ]);
    const totalStockValue = stockByLocation.reduce((a,c)=>a+c.value,0);
    stockByLocation.forEach(l => l.percentage = totalStockValue > 0 ? Math.round((l.value/totalStockValue)*100) : 0);

    const ageingBuckets = await Batch.aggregate([
      { $match: { orgId, qty: { $gt: 0 } } },
      { $project: { ageInDays: { $divide:[{ $subtract:[new Date(),'$receivedDate'] },86400000] } } },
      { $bucket: { groupBy:'$ageInDays', boundaries:[0,30,60,90,Infinity], default:'Other', output:{ count:{ $sum:1 } } } }
    ]);
    const totalBatches = ageingBuckets.reduce((a,c)=>a+c.count,0);
    const stockAgeing = ['0-30 Days','31-60 Days','61-90 Days','90+ Days'].map((range,i) => {
      const ids = [0,30,60,90];
      const b = ageingBuckets.find(x=>x._id===ids[i]);
      return { range, value: b && totalBatches > 0 ? Math.round((b.count/totalBatches)*100) : 0 };
    });

    const expiredCount    = await Batch.countDocuments({ orgId, expiryDate:{ $lt:now }, qty:{ $gt:0 } });
    const nearExpiryCount = await Batch.countDocuments({ orgId, expiryDate:{ $gte:now,$lte:d30f }, qty:{ $gt:0 } });
    const goodStockCount  = await Batch.countDocuments({ orgId, expiryDate:{ $gt:d30f }, qty:{ $gt:0 } });
    const stockCategories = [
      { name:'Expired', value:expiredCount, color:'#EF4444' },
      { name:'Near Expiry', value:nearExpiryCount, color:'#F59E0B' },
      { name:'Good Stock', value:goodStockCount, color:'#10B981' },
    ];

    const recentTransfers = await StockTransaction.find({ orgId, type:'TRANSFER' })
      .sort({ createdAt:-1 }).limit(5)
      .populate('productId','name').populate('fromLocation','name').populate('toLocation','name');

    const lowStockItems = await Product.aggregate([
      { $match: { orgId } },
      { $lookup: { from:'batches', localField:'_id', foreignField:'productId', as:'batches' } },
      { $project: { name:1, sku:1, reorderLevel:1, totalQty:{ $sum:'$batches.qty' } } },
      { $match: { $expr:{ $lte:['$totalQty','$reorderLevel'] } } },
      { $limit:5 }
    ]);

    res.send({ stockValue:{ total:totalStockValue, byLocation:stockByLocation }, stockAgeing, stockCategories, recentTransfers, lowStockItems });
  } catch (e) { console.error(e); res.status(500).send(e); }
};

module.exports = { getStats };
