import { useState, useEffect, useRef } from "react";
import axios from "axios";
import { Star, Send, User, ImagePlus, X, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { API_BASE_URL } from "@/lib/api-config";

interface Review {
  id: number;
  rating: number;
  comment: string;
  images: string[];
  created_at: string;
  user: {
    username: string;
    avatar_letter: string;
  };
}

interface ReviewSectionProps {
  placeId: string;
}

const MAX_CHARS = 1000;

const ReviewSection = ({ placeId }: ReviewSectionProps) => {
  const { username, isLoggedIn } = useAuth();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const [deleteReviewId, setDeleteReviewId] = useState<number | null>(null);

  useEffect(() => {
    if (!placeId) return;
    axios.get(`${API_BASE_URL}/api/reviews/${placeId}`)
      .then(res => setReviews(res.data))
      .catch(err => console.error(err));
  }, [placeId]);

  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = "auto";
      textarea.style.height = `${textarea.scrollHeight}px`;
    }
  }, [comment]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const filesArray = Array.from(e.target.files);
      if (selectedFiles.length + filesArray.length > 10) {
          toast.error("Bạn chỉ được chọn tối đa 10 ảnh!");
          return;
      }
      const newPreviews = filesArray.map(file => URL.createObjectURL(file));
      setSelectedFiles(prev => [...prev, ...filesArray]);
      setPreviewUrls(prev => [...prev, ...newPreviews]);
    }
  };

  const removeImage = (index: number) => {
      setSelectedFiles(prev => prev.filter((_, i) => i !== index));
      setPreviewUrls(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!isLoggedIn) { toast.error("Bạn cần đăng nhập"); return; }
    if (rating === 0) { toast.error("Vui lòng chọn số sao"); return; }
    if (!comment.trim()) { toast.error("Vui lòng nhập nội dung"); return; }

    setIsSubmitting(true);
    try {
      const formData = new FormData();
      formData.append("username", username || "");
      formData.append("place_id", placeId);
      formData.append("rating", rating.toString());
      formData.append("comment", comment);
      
      selectedFiles.forEach(file => {
          formData.append("images", file);
      });

      const res = await axios.post(`${API_BASE_URL}/api/reviews`, formData, {
        headers: { "Content-Type": "multipart/form-data" }
      });
      
      setReviews([res.data.review, ...reviews]);
      
      setRating(0);
      setComment("");
      setSelectedFiles([]);
      setPreviewUrls([]);
      if (fileInputRef.current) fileInputRef.current.value = "";
      if (textareaRef.current) textareaRef.current.style.height = "auto";

      toast.success("Đánh giá thành công!");
    } catch (error) {
      toast.error("Gửi đánh giá thất bại");
    } finally {
      setIsSubmitting(false);
    }
  };

  const confirmDelete = (reviewId: number) => {
      setDeleteReviewId(reviewId);
  };

  const executeDelete = async () => {
      if (!deleteReviewId) return;
      try {
          await axios.delete(`${API_BASE_URL}/api/reviews/${deleteReviewId}`);
          setReviews(prev => prev.filter(r => r.id !== deleteReviewId));
          toast.success("Đã xóa đánh giá");
      } catch (error) {
          toast.error("Lỗi khi xóa đánh giá");
      } finally {
          setDeleteReviewId(null);
      }
  };

  return (
    <div className="space-y-6 md:space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex items-center justify-between">
        <h3 className="text-xl md:text-2xl font-bold text-gray-800">Đánh giá ({reviews.length})</h3>
      </div>

      {/* INPUT CARD */}
      <Card className="p-4 md:p-6 bg-gray-50/50 border-gray-200 shadow-sm">
        <div className="flex flex-col md:flex-row gap-4">
          
          {/* Avatar: Ẩn trên mobile để tiết kiệm chỗ, hiện trên PC */}
          <div className="hidden md:block">
            <Avatar className="h-10 w-10">
                <AvatarFallback className="bg-green-600 text-white font-bold">
                {username ? username[0].toUpperCase() : <User className="h-5 w-5"/>}
                </AvatarFallback>
            </Avatar>
          </div>
          
          <div className="flex-1 space-y-4">
            
            {/* Rating Stars: Mobile căn giữa, to hơn */}
            <div className="flex justify-center md:justify-start items-center gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  className="focus:outline-none transition-transform hover:scale-110 active:scale-95 p-1"
                  onMouseEnter={() => setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(0)}
                  onClick={() => setRating(star)}
                >
                  <Star 
                    // Mobile: h-9 w-9 (to dễ bấm), PC: h-6 w-6
                    className={`h-9 w-9 md:h-6 md:w-6 transition-colors duration-200 ${star <= (hoverRating || rating) ? "fill-yellow-400 text-yellow-400" : "text-gray-300"}`} 
                  />
                </button>
              ))}
            </div>

            {/* Textarea */}
            <div className="relative">
                <Textarea 
                  ref={textareaRef}
                  placeholder="Chia sẻ trải nghiệm chân thực của bạn..."
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  disabled={!isLoggedIn}
                  maxLength={MAX_CHARS} 
                  className={`
                    min-h-[120px] md:min-h-[100px] max-h-[200px] w-full bg-white rounded-xl border-gray-200
                    focus:ring-2 focus:ring-green-500/20 focus:border-green-500
                    resize-none transition-all duration-200
                    placeholder:text-gray-400 text-base leading-relaxed
                  `}
                />
            </div>

            {/* Preview Images */}
            {previewUrls.length > 0 && (
                <div className="flex gap-3 overflow-x-auto pb-2 pt-2 px-1 scrollbar-hide">
                    {previewUrls.map((url, idx) => (
                        <div key={idx} className="relative w-20 h-20 md:w-24 md:h-24 flex-shrink-0 group">
                            <img src={url} alt="preview" className="w-full h-full object-cover rounded-lg border border-gray-200 shadow-sm" />
                            <button 
                                type="button"
                                onClick={() => removeImage(idx)}
                                className="absolute -top-2 -right-2 bg-white text-red-500 border border-gray-100 rounded-full p-1 shadow-md hover:bg-red-50 z-10"
                            >
                                <X className="h-3 w-3" />
                            </button>
                        </div>
                    ))}
                </div>
            )}

            {/* Action Bar: Mobile xếp dọc, PC xếp ngang */}
            <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 md:gap-0 pt-2 border-t border-gray-100">
                
                {/* Upload Button */}
                <div>
                    <input 
                        type="file" 
                        ref={fileInputRef}
                        onChange={handleFileChange}
                        className="hidden"
                        multiple 
                        accept="image/*" 
                    />
                    <Button 
                        type="button"
                        variant="outline"
                        size="sm"
                        // Mobile: w-full, PC: auto
                        className="w-full md:w-auto text-muted-foreground hover:text-green-600 hover:bg-green-50 hover:border-green-400 border-dashed border-gray-300 rounded-lg md:rounded-full h-10 md:h-9"
                        onClick={() => fileInputRef.current?.click()} 
                        disabled={!isLoggedIn}
                    >
                        <ImagePlus className="h-5 w-5 mr-2" />
                        <span className="text-sm font-medium">Thêm ảnh ({selectedFiles.length}/10)</span>
                    </Button>
                </div>

                {/* Submit Area */}
                <div className="flex flex-col-reverse md:flex-row items-center gap-3 md:gap-4">
                    <span className={`text-xs font-medium transition-colors ${comment.length >= MAX_CHARS ? 'text-red-500' : 'text-gray-400'}`}>
                        {comment.length}/{MAX_CHARS}
                    </span>

                    <Button 
                        onClick={handleSubmit} 
                        disabled={!isLoggedIn || isSubmitting}
                        // Mobile: w-full, h-11 (to hơn), PC: w-auto
                        className="w-full md:w-auto h-11 md:h-10 bg-green-600 hover:bg-green-700 text-white rounded-lg md:rounded-full font-semibold shadow-sm"
                    >
                        {isSubmitting ? "Đang gửi..." : <><Send className="w-4 h-4 mr-2" /> Gửi đánh giá</>}
                    </Button>
                </div>
            </div>
          </div>
        </div>
      </Card>

      {/* List Reviews */}
      <div className="space-y-4 md:space-y-6">
        {reviews.map((review) => (
          <div key={review.id} className="flex gap-3 md:gap-4 p-4 md:p-5 rounded-2xl bg-white border border-gray-100 shadow-sm">
            <Avatar className="h-8 w-8 md:h-10 md:w-10 mt-1 border border-gray-100 flex-shrink-0">
              <AvatarFallback className="bg-blue-50 text-blue-600 font-bold text-xs md:text-sm">
                {review.user.avatar_letter}
              </AvatarFallback>
            </Avatar>
            
            <div className="flex-1 space-y-2 md:space-y-3 min-w-0">
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="font-bold text-gray-900 text-sm">{review.user.username}</h4>
                  <span className="text-xs text-gray-400 font-medium">
                    {new Date(review.created_at).toLocaleDateString("vi-VN")}
                  </span>
                </div>
                
                <div className="flex items-center gap-2 md:gap-3">
                    <div className="flex bg-yellow-50 px-2 py-0.5 md:py-1 rounded-full border border-yellow-100">
                        {Array.from({ length: 5 }).map((_, i) => (
                            <Star key={i} className={`h-2.5 w-2.5 md:h-3 md:w-3 ${i < review.rating ? "fill-yellow-400 text-yellow-400" : "text-gray-200"}`} />
                        ))}
                    </div>

                    {username === review.user.username && (
                        <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-6 w-6 md:h-7 md:w-7 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full"
                            onClick={() => confirmDelete(review.id)}
                        >
                            <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                    )}
                </div>
              </div>

              <p className="text-gray-700 text-sm whitespace-pre-wrap leading-relaxed break-words">{review.comment}</p>
              
              {review.images && review.images.length > 0 && (
                <div className="flex gap-2 mt-2 overflow-x-auto pb-2 scrollbar-hide">
                  {review.images.map((img, idx) => (
                    <img 
                      key={idx} 
                      src={img} 
                      alt="review-img" 
                      className="h-20 w-20 md:h-24 md:w-24 rounded-lg object-cover border border-gray-100 flex-shrink-0"
                      onClick={() => window.open(img, '_blank')}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      <AlertDialog open={!!deleteReviewId} onOpenChange={(open) => !open && setDeleteReviewId(null)}>
        <AlertDialogContent className="rounded-xl w-[90%] md:w-full">
          <AlertDialogHeader>
            <AlertDialogTitle>Xóa đánh giá?</AlertDialogTitle>
            <AlertDialogDescription>
              Bạn có chắc chắn muốn xóa đánh giá này không? Hành động này không thể hoàn tác.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-row gap-2 justify-end">
            <AlertDialogCancel className="rounded-lg mt-0 flex-1 md:flex-none">Hủy bỏ</AlertDialogCancel>
            <AlertDialogAction onClick={executeDelete} className="bg-red-600 hover:bg-red-700 text-white rounded-lg flex-1 md:flex-none">
                Xóa ngay
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ReviewSection;