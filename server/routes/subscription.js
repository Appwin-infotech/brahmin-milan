const { Router } = require('express');
const controller = require('../controllers/subscription');
const verifyToken = require("../middlewares/auth");
const verifyAdminToken = require("../middlewares/authAdmin");
const upload = require('../config/multerConfig');

const router = Router();

router.post('/createPlan', upload.single('photo'), verifyAdminToken, controller.createSubscriptionPlan);
router.patch('/updatePlan', upload.single('photo'), verifyAdminToken, controller.updateSubscriptionPlan);
router.delete('/deletePlan/:planId', verifyAdminToken, controller.deleteSubscriptionPlan);
router.delete('/deleteRecord/:id', verifyAdminToken, controller.deleteSubscriptionRecord);
router.post('/buy', verifyToken, controller.buySubscription);
router.post('/cancel-pending', controller.cancelPendingSubscription);
router.post('/setTrial', verifyToken, controller.setTrialSubscription);
router.post('/verifyPayment', controller.verifyPayment);
router.get('/getRazorPayKey', verifyToken, controller.getRazorPayKey);
router.get('/history', verifyToken, controller.getSubscriptionHistory);
router.get('/trialHistory', verifyToken, controller.getTrialHistory);



module.exports = router;