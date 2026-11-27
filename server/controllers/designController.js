import mongoose from 'mongoose';
import Design from '../models/Design.js';
import Product from '../models/Product.js';

const isValidId = (id) => mongoose.Types.ObjectId.isValid(id);

export const createDesign = async (req, res) => {
  try {
    const { productId, name, canvasData, previewUrl } = req.body;
    if (!productId || !isValidId(productId)) {
      return res.status(400).json({ success: false, message: 'A valid productId is required.' });
    }
    const product = await Product.findOne({ _id: productId, isActive: true });
    if (!product) return res.status(404).json({ success: false, message: 'Product not found.' });

    const design = await Design.create({
      customer: req.user._id,
      product: product._id,
      name: typeof name === 'string' && name.trim() ? name.trim().slice(0, 100) : 'Untitled Design',
      canvasData: canvasData && typeof canvasData === 'object' ? canvasData : {},
      previewUrl: typeof previewUrl === 'string' ? previewUrl : '',
      status: 'draft',
    });
    return res.status(201).json({ success: true, message: 'Design saved.', design });
  } catch (error) {
    console.error('Create design error:', error);
    return res.status(500).json({ success: false, message: 'Unable to save design.' });
  }
};

export const getMyDesigns = async (req, res) => {
  try {
    const designs = await Design.find({ customer: req.user._id })
      .populate('product', 'name slug division image')
      .sort({ updatedAt: -1 });
    return res.json({ success: true, designs });
  } catch (error) {
    console.error('Get designs error:', error);
    return res.status(500).json({ success: false, message: 'Unable to load designs.' });
  }
};

export const getDesignById = async (req, res) => {
  try {
    if (!isValidId(req.params.id)) return res.status(400).json({ success: false, message: 'Invalid design ID.' });
    const design = await Design.findOne({ _id: req.params.id, customer: req.user._id })
      .populate('product', 'name slug division');
    if (!design) return res.status(404).json({ success: false, message: 'Design not found.' });
    return res.json({ success: true, design });
  } catch (error) {
    console.error('Get design error:', error);
    return res.status(500).json({ success: false, message: 'Unable to load design.' });
  }
};

export const updateDesign = async (req, res) => {
  try {
    if (!isValidId(req.params.id)) return res.status(400).json({ success: false, message: 'Invalid design ID.' });
    const updates = {};
    if (typeof req.body.name === 'string') updates.name = req.body.name.trim().slice(0, 100) || 'Untitled Design';
    if (req.body.canvasData && typeof req.body.canvasData === 'object') updates.canvasData = req.body.canvasData;
    if (typeof req.body.previewUrl === 'string') updates.previewUrl = req.body.previewUrl;
    const design = await Design.findOneAndUpdate(
      { _id: req.params.id, customer: req.user._id, status: { $in: ['draft', 'submitted'] } },
      { $set: updates }, { new: true, runValidators: true }
    ).populate('product', 'name slug division');
    if (!design) return res.status(404).json({ success: false, message: 'Editable design not found.' });
    return res.json({ success: true, message: 'Design updated.', design });
  } catch (error) {
    console.error('Update design error:', error);
    return res.status(500).json({ success: false, message: 'Unable to update design.' });
  }
};

export const deleteDesign = async (req, res) => {
  try {
    if (!isValidId(req.params.id)) return res.status(400).json({ success: false, message: 'Invalid design ID.' });
    const design = await Design.findOneAndDelete({ _id: req.params.id, customer: req.user._id, status: 'draft' });
    if (!design) return res.status(404).json({ success: false, message: 'Draft design not found.' });
    return res.json({ success: true, message: 'Draft design deleted.' });
  } catch (error) {
    console.error('Delete design error:', error);
    return res.status(500).json({ success: false, message: 'Unable to delete design.' });
  }
};
