'use client';

import { useState, useEffect, useRef } from 'react';
import { useUIStore } from '../../store/uiStore';
import { useGroceryStore } from '../../store/groceryStore';
import { useI18nStore, I18nState } from '../../store/i18nStore';
import { predictExpiryDays } from '../../utils/aiPredictor';
import { 
  X, Camera, Loader2, Sparkles, 
  Trash2, ImageIcon, Video, AlertCircle 
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function AddGroceryModal() {
  const { isAddModalOpen, closeAddModal } = useUIStore();
  const { addGrocery } = useGroceryStore();
  const t = useI18nStore((state: I18nState) => state.t);

  // Form States
  const [itemName, setItemName] = useState('');
  const [brand, setBrand] = useState('');
  const [category, setCategory] = useState<'Dairy & Eggs' | 'Fruits & Vegetables' | 'Bakery' | 'Meat & Fish' | 'Pantry' | 'Beverages' | 'Snacks' | 'Others'>('Dairy & Eggs');
  const [quantity, setQuantity] = useState('');
  const [purchaseDate, setPurchaseDate] = useState(new Date().toISOString().split('T')[0]);
  const [expiryDate, setExpiryDate] = useState('');
  const [notes, setNotes] = useState('');
  
  // Image handling states
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  
  // Camera & Webcam modes
  const [showPhotoOptions, setShowPhotoOptions] = useState(false);
  const [isWebcamActive, setIsWebcamActive] = useState(false);
  const [capturedBlob, setCapturedBlob] = useState<Blob | null>(null);

  // UI Utilities
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Refs
  const fileInputRef = useRef<HTMLInputElement>(null);
  const nativeCameraInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // Media streams reference for proper cleanup
  const webcamStreamRef = useRef<MediaStream | null>(null);

  // Category listing options matching DB schema
  const categories = [
    'Dairy & Eggs',
    'Fruits & Vegetables',
    'Bakery',
    'Meat & Fish',
    'Pantry',
    'Beverages',
    'Snacks',
    'Others'
  ];

  // Auto Expiry Calculation Logic
  useEffect(() => {
    if (itemName && purchaseDate && !expiryDate) {
      const days = predictExpiryDays(itemName, category);
      const pDate = new Date(purchaseDate);
      pDate.setDate(pDate.getDate() + days);
      setExpiryDate(pDate.toISOString().split('T')[0]);
    }
  }, [itemName, category, purchaseDate, expiryDate]);

  // Clean up streams on close
  useEffect(() => {
    if (!isAddModalOpen) {
      stopWebcam();
    }
  }, [isAddModalOpen]);

  // Web camera handlers
  const startWebcam = async () => {
    setErrors({});
    setShowPhotoOptions(false);
    setIsWebcamActive(true);
    setCapturedBlob(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: 640, height: 480 },
        audio: false
      });
      webcamStreamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err: any) {
      console.error('Webcam permission error:', err);
      setErrors({ api: 'Could not access device webcam. Please upload image instead.' });
      setIsWebcamActive(false);
    }
  };

  const stopWebcam = () => {
    if (webcamStreamRef.current) {
      webcamStreamRef.current.getTracks().forEach((track) => track.stop());
      webcamStreamRef.current = null;
    }
    setIsWebcamActive(false);
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        canvas.toBlob((blob) => {
          if (blob) {
            setCapturedBlob(blob);
            const file = new File([blob], `capture-${Date.now()}.png`, { type: 'image/png' });
            setImageFile(file);
            setImagePreview(URL.createObjectURL(blob));
            stopWebcam();
          }
        }, 'image/png');
      }
    }
  };

  // Gallery or File Picker handlers
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
      setShowPhotoOptions(false);
    }
  };

  const removePhoto = () => {
    setImageFile(null);
    setImagePreview(null);
    setCapturedBlob(null);
  };

  // Submit Handler
  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    // Client-side validations
    const formErrors: Record<string, string> = {};
    if (!itemName.trim()) formErrors.itemName = 'Item name is required';
    if (!category) formErrors.category = 'Category is required';
    if (!expiryDate) formErrors.expiryDate = 'Expiry date is required';
    if (new Date(expiryDate) < new Date(purchaseDate)) {
      formErrors.expiryDate = 'Expiry date cannot be prior to purchase date';
    }

    if (Object.keys(formErrors).length > 0) {
      setErrors(formErrors);
      return;
    }

    setIsSubmitting(true);

    const formData = new FormData();
    formData.append('itemName', itemName);
    formData.append('brand', brand);
    formData.append('category', category);
    formData.append('quantity', quantity || '1 unit');
    formData.append('purchaseDate', purchaseDate);
    formData.append('expiryDate', expiryDate);
    formData.append('notes', notes);
    
    if (imageFile) {
      formData.append('image', imageFile);
    }

    // Call store add grocery
    const success = await addGrocery(formData);
    setIsSubmitting(false);

    if (success) {
      // Clean form states
      setItemName('');
      setBrand('');
      setCategory('Dairy & Eggs');
      setQuantity('');
      setPurchaseDate(new Date().toISOString().split('T')[0]);
      setExpiryDate('');
      setNotes('');
      setImageFile(null);
      setImagePreview(null);
      closeAddModal();
    } else {
      setErrors({ api: 'Failed to save grocery. Please check details and try again.' });
    }
  };

  if (!isAddModalOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex items-end md:items-center justify-center p-0 md:p-4">
        {/* Background Click Shield */}
        <motion.div 
          className="absolute inset-0 cursor-pointer"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => {
            if (!isSubmitting && !isWebcamActive) closeAddModal();
          }}
        />

        {/* Modal Window Sheet */}
        <motion.div
          className="relative bg-zinc-950 w-full md:max-w-lg max-h-[92vh] md:max-h-[85vh] rounded-t-custom md:rounded-custom shadow-2xl flex flex-col overflow-hidden z-10 border border-zinc-800"
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ type: 'spring', damping: 25, stiffness: 220 }}
        >
          {/* Header */}
          <div className="px-5 py-3.5 border-b border-zinc-800 flex justify-between items-center select-none bg-zinc-900/50">
            <div>
              <h2 className="text-xs font-black text-green-400 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-green-400" />
                ADD NEW GROCERY
              </h2>
              <p className="text-[9px] text-zinc-500 font-semibold mt-0.5 uppercase tracking-widest">
                Auto Shelf-Life Predictions Active
              </p>
            </div>
            <button 
              onClick={() => {
                stopWebcam();
                closeAddModal();
              }}
              className="p-1 rounded-xl hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 cursor-pointer transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Form Scroll Content */}
          <form onSubmit={handleFormSubmit} className="flex-1 overflow-y-auto px-5 py-4 space-y-4 no-scrollbar">
            
            {/* Warning / Success Alerts */}
            {errors.api && (
              <div className="bg-red-950/20 border border-red-900/50 text-red-400 p-2.5 rounded-xl text-[10px] font-bold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
                <span>{errors.api}</span>
              </div>
            )}

            {/* Photo Attachment Wrapper */}
            <div className="flex flex-col items-center select-none bg-zinc-900/40 p-4 rounded-2xl border border-zinc-800/80">
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleImageChange} 
                className="hidden" 
                accept="image/*"
              />
              {/* Native Mobile Camera Dispatch */}
              <input 
                type="file" 
                ref={nativeCameraInputRef} 
                onChange={handleImageChange} 
                className="hidden" 
                accept="image/*"
                capture="environment"
              />
              
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowPhotoOptions(!showPhotoOptions)}
                  className="group relative w-24 h-24 rounded-full bg-zinc-900 hover:bg-zinc-800 border-2 border-dashed border-green-500/30 flex flex-col items-center justify-center overflow-hidden cursor-pointer transition-all duration-150"
                >
                  {imagePreview ? (
                    <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                  ) : (
                    <div className="flex flex-col items-center justify-center">
                      <div className="w-9 h-9 bg-green-500 rounded-full flex items-center justify-center text-zinc-950 shadow-md shadow-green-500/20 group-hover:scale-105 transition-transform">
                        <Camera className="w-4.5 h-4.5" />
                      </div>
                      <span className="text-[8px] mt-1.5 font-black text-zinc-400 uppercase tracking-wider">
                        ADD PHOTO
                      </span>
                    </div>
                  )}
                </button>

                {imagePreview && (
                  <button
                    type="button"
                    onClick={removePhoto}
                    className="absolute -top-1 -right-1 bg-red-500 hover:bg-red-600 text-white p-1 rounded-full shadow-lg cursor-pointer transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Photo Source Options Popover */}
              {showPhotoOptions && (
                <div className="mt-3 flex gap-2 w-full max-w-xs">
                  {/* Laptop Webcam or Device Camera */}
                  <button
                    type="button"
                    onClick={() => {
                      if (/Mobi|Android|iPhone/i.test(navigator.userAgent)) {
                        nativeCameraInputRef.current?.click();
                        setShowPhotoOptions(false);
                      } else {
                        startWebcam();
                      }
                    }}
                    className="flex-1 bg-green-500/10 hover:bg-green-500/20 border border-green-500/20 text-green-400 py-1.5 px-3 rounded-xl text-[9px] font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Video className="w-3.5 h-3.5" />
                    <span>USE CAMERA</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex-1 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-300 py-1.5 px-3 rounded-xl text-[9px] font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <ImageIcon className="w-3.5 h-3.5" />
                    <span>FROM FILES</span>
                  </button>
                </div>
              )}
            </div>

            {/* Webcam Live Capture Window Overlay (Desktop/Laptop) */}
            {isWebcamActive && (
              <div className="relative bg-zinc-950 rounded-2xl overflow-hidden border border-zinc-800 p-2 flex flex-col items-center">
                <video 
                  ref={videoRef} 
                  autoPlay 
                  playsInline 
                  muted 
                  className="w-full max-h-56 object-cover rounded-xl"
                />
                <canvas ref={canvasRef} className="hidden" />
                <div className="flex gap-2 mt-2 w-full">
                  <button
                    type="button"
                    onClick={capturePhoto}
                    className="flex-1 bg-green-500 text-zinc-950 py-2 rounded-xl text-[9px] font-black uppercase tracking-wider transition-colors cursor-pointer"
                  >
                    CAPTURE FRAME
                  </button>
                  <button
                    type="button"
                    onClick={stopWebcam}
                    className="bg-zinc-800 text-zinc-300 py-2 px-4 rounded-xl text-[9px] font-bold uppercase tracking-wider transition-colors cursor-pointer"
                  >
                    CANCEL
                  </button>
                </div>
              </div>
            )}

            {/* Form Fields Grid */}
            <div className="space-y-3.5">
              
              {/* Item Name Input */}
              <div className="space-y-1">
                <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest block">
                  PRODUCT NAME *
                </label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="e.g. Organic Whole Milk"
                    value={itemName}
                    onChange={(e) => setItemName(e.target.value)}
                    className={`w-full px-3.5 py-2.5 rounded-2xl bg-zinc-900 border border-zinc-800 text-zinc-100 text-xs font-semibold focus:outline-none focus:border-green-500 transition-all ${
                      errors.itemName ? 'border-red-900 focus:border-red-500' : ''
                    }`}
                  />
                  {itemName && (
                    <Sparkles className="absolute right-3 top-3 w-4 h-4 text-green-400 animate-pulse pointer-events-none" />
                  )}
                </div>
                {errors.itemName && (
                  <span className="text-[9px] text-red-500 font-semibold">{errors.itemName}</span>
                )}
              </div>

              {/* Brand Name Input */}
              <div className="space-y-1">
                <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest block">
                  BRAND / MANUFACTURER
                </label>
                <input
                  type="text"
                  placeholder="e.g. Kirkland Signature"
                  value={brand}
                  onChange={(e) => setBrand(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-2xl bg-zinc-900 border border-zinc-800 text-zinc-100 text-xs font-semibold focus:outline-none focus:border-green-500 transition-all"
                />
              </div>

              {/* Grid block for category and quantity */}
              <div className="grid grid-cols-2 gap-3">
                {/* Category Dropdown Selector */}
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest block">
                    CATEGORY *
                  </label>
                  <select
                    value={category}
                    onChange={(e: any) => setCategory(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-2xl bg-zinc-900 border border-zinc-800 text-zinc-100 text-xs font-semibold focus:outline-none focus:border-green-500 transition-all"
                  >
                    {categories.map((c) => (
                      <option key={c} value={c} className="bg-zinc-950 text-zinc-100">
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Quantity Input */}
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest block">
                    QUANTITY
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 1 liter or 2 packs"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-2xl bg-zinc-900 border border-zinc-800 text-zinc-100 text-xs font-semibold focus:outline-none focus:border-green-500 transition-all"
                  />
                </div>
              </div>

              {/* Grid block for purchase and expiry dates */}
              <div className="grid grid-cols-2 gap-3">
                {/* Purchase Date */}
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest block">
                    PURCHASE DATE
                  </label>
                  <input
                    type="date"
                    value={purchaseDate}
                    onChange={(e) => setPurchaseDate(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-2xl bg-zinc-900 border border-zinc-800 text-zinc-100 text-xs font-semibold focus:outline-none focus:border-green-500 transition-all"
                  />
                </div>

                {/* Expiry Date */}
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest block">
                    EXPIRY DATE *
                  </label>
                  <input
                    type="date"
                    value={expiryDate}
                    onChange={(e) => setExpiryDate(e.target.value)}
                    className={`w-full px-3.5 py-2.5 rounded-2xl bg-zinc-900 border border-zinc-800 text-zinc-100 text-xs font-semibold focus:outline-none focus:border-green-500 transition-all ${
                      errors.expiryDate ? 'border-red-900 focus:border-red-500' : ''
                    }`}
                  />
                  {errors.expiryDate && (
                    <span className="text-[9px] text-red-500 font-semibold block mt-1">{errors.expiryDate}</span>
                  )}
                </div>
              </div>

              {/* Optional Notes */}
              <div className="space-y-1">
                <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest block">
                  NOTES (OPTIONAL)
                </label>
                <textarea
                  placeholder="Add expiry warnings, storage notes, etc..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  className="w-full px-3.5 py-2.5 rounded-2xl bg-zinc-900 border border-zinc-800 text-zinc-100 text-xs font-semibold focus:outline-none focus:border-green-500 transition-all resize-none"
                />
              </div>

            </div>

            {/* Action Buttons */}
            <div className="pt-2 pb-1">
              <button
                type="submit"
                disabled={isSubmitting || isWebcamActive}
                className="w-full bg-green-500 hover:bg-green-400 disabled:bg-green-500/40 text-zinc-950 py-3.5 rounded-2xl text-[10px] font-black shadow-lg shadow-green-500/10 hover:shadow-green-500/20 active:scale-99 transition-all flex items-center justify-center gap-1.5 cursor-pointer uppercase tracking-widest"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>SAVING GROCERY...</span>
                  </>
                ) : (
                  <span>{t('saveGrocery')}</span>
                )}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
