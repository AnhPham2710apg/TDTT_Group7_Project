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

      const res = await axios.post("${API_BASE_URL}/api/reviews", formData, {
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
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex items-center justify-between">
        <h3 className="text-2xl font-bold text-gray-800">Đánh giá ({reviews.length})</h3>
      </div>

      <Card className="p-6 bg-gray-50/50 border-gray-200 shadow-sm">
        <div className="flex gap-4">
          <Avatar className="h-10 w-10">
            <AvatarFallback className="bg-green-600 text-white font-bold">
              {username ? username[0].toUpperCase() : <User className="h-5 w-5"/>}
            </AvatarFallback>
          </Avatar>
          
          <div className="flex-1 space-y-4">
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  className="focus:outline-none transition-transform hover:scale-110 active:scale-95"
                  onMouseEnter={() => setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(0)}
                  onClick={() => setRating(star)}
                >
                  <Star className={`h-6 w-6 ${star <= (hoverRating || rating) ? "fill-yellow-400 text-yellow-400" : "text-gray-300"}`} />
                </button>
              ))}
            </div>

            {/* Textarea - Đã bỏ Counter ở đây */}
            <div className="relative">
                <Textarea 
                  ref={textareaRef}
                  placeholder="Chia sẻ trải nghiệm chân thực của bạn..."
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  disabled={!isLoggedIn}
                  maxLength={MAX_CHARS} 
                  className={`
                    min-h-[100px] max-h-[200px] w-full bg-white rounded-xl border-gray-200
                    focus:ring-2 focus:ring-green-500/20 focus:border-green-500
                    resize-none transition-all duration-200
                    placeholder:text-gray-400 text-base leading-relaxed
                    
                    overflow-y-auto
                    [&::-webkit-scrollbar]:w-2
                    [&::-webkit-scrollbar-track]:bg-transparent
                    [&::-webkit-scrollbar-thumb]:bg-gray-200
                    [&::-webkit-scrollbar-thumb]:rounded-full
                    hover:[&::-webkit-scrollbar-thumb]:bg-gray-300
                  `}
                />
            </div>

            {/* Preview Images */}
            {previewUrls.length > 0 && (
                <div className="flex gap-3 overflow-x-auto pb-2 pt-4 pr-4 pl-1 
                    [&::-webkit-scrollbar]:h-2
                    [&::-webkit-scrollbar-track]:bg-transparent
                    [&::-webkit-scrollbar-thumb]:bg-gray-200
                    [&::-webkit-scrollbar-thumb]:rounded-full
                ">
                    {previewUrls.map((url, idx) => (
                        <div key={idx} className="relative w-24 h-24 flex-shrink-0 group">
                            <img src={url} alt="preview" className="w-full h-full object-cover rounded-lg border border-gray-200 shadow-sm" />
                            <button 
                                type="button"
                                onClick={() => removeImage(idx)}
                                className="absolute -top-2 -right-2 bg-white text-red-500 border border-gray-100 rounded-full p-1 shadow-md hover:bg-red-50 transition-all z-10 opacity-0 group-hover:opacity-100 scale-90 group-hover:scale-100"
                            >
                                <X className="h-3.5 w-3.5" />
                            </button>
                        </div>
                    ))}
                </div>
            )}

            {/* Action Bar */}
            <div className="flex items-center justify-between pt-2 border-t border-gray-100">
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
                        className="text-muted-foreground hover:text-green-600 hover:bg-green-50 hover:border-green-400 border-dashed border-gray-300 rounded-full px-4 transition-all"
                        onClick={() => fileInputRef.current?.click()} 
                        disabled={!isLoggedIn}
                    >
                        <ImagePlus className="h-5 w-5 mr-2" />
                        <span className="text-sm font-medium">Thêm ảnh ({selectedFiles.length}/10)</span>
                    </Button>
                </div>

                {/* --- KHU VỰC COUNTER & NÚT GỬI --- */}
                <div className="flex items-center gap-4">
                    {/* Character Counter (Đã chuyển xuống đây) */}
                    <span className={`text-xs font-medium transition-colors
                        ${comment.length >= MAX_CHARS ? 'text-red-500' : (comment.length >= MAX_CHARS*0.9) ? 'text-yellow-500' : 'text-gray-400'}
                    `}>
                        {comment.length}/{MAX_CHARS}
                    </span>

                    <Button 
                        onClick={handleSubmit} 
                        disabled={!isLoggedIn || isSubmitting}
                        className="bg-green-600 hover:bg-green-700 text-white rounded-full px-6 font-semibold shadow-sm hover:shadow active:scale-95 transition-all"
                    >
                        {isSubmitting ? "Đang gửi..." : <><Send className="w-4 h-4 mr-2" /> Gửi đánh giá</>}
                    </Button>
                </div>
            </div>
          </div>
        </div>
      </Card>

      {/* List Reviews (Giữ nguyên) */}
      <div className="space-y-6">
        {reviews.map((review) => (
          <div key={review.id} className="flex gap-4 p-5 rounded-2xl bg-white border border-gray-100 shadow-sm hover:shadow-md transition-shadow duration-300">
            <Avatar className="h-10 w-10 mt-1 border border-gray-100">
              <AvatarFallback className="bg-blue-50 text-blue-600 font-bold text-sm">
                {review.user.avatar_letter}
              </AvatarFallback>
            </Avatar>
            
            <div className="flex-1 space-y-3">
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="font-bold text-gray-900 text-sm">{review.user.username}</h4>
                  <span className="text-xs text-gray-400 font-medium">
                    {new Date(review.created_at).toLocaleDateString("vi-VN")}
                  </span>
                </div>
                
                <div className="flex items-center gap-3">
                    <div className="flex bg-yellow-50 px-2.5 py-1 rounded-full border border-yellow-100">
                        {Array.from({ length: 5 }).map((_, i) => (
                            <Star key={i} className={`h-3 w-3 ${i < review.rating ? "fill-yellow-400 text-yellow-400" : "text-gray-200"}`} />
                        ))}
                    </div>

                    {username === review.user.username && (
                        <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-7 w-7 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full"
                            onClick={() => confirmDelete(review.id)}
                            title="Xóa bài viết"
                        >
                            <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                    )}
                </div>
              </div>

              <p className="text-gray-700 text-sm whitespace-pre-wrap leading-relaxed">{review.comment}</p>
              
              {review.images && review.images.length > 0 && (
                <div className="flex gap-2 mt-3 overflow-x-auto pb-2 
                    [&::-webkit-scrollbar]:h-1.5
                    [&::-webkit-scrollbar-track]:bg-transparent
                    [&::-webkit-scrollbar-thumb]:bg-gray-200
                    [&::-webkit-scrollbar-thumb]:rounded-full
                ">
                  {review.images.map((img, idx) => (
                    <img 
                      key={idx} 
                      src={img} 
                      alt="review-img" 
                      className="h-24 w-24 rounded-lg object-cover border border-gray-100 cursor-zoom-in hover:opacity-90 transition-opacity"
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
        <AlertDialogContent className="rounded-xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Xóa đánh giá?</AlertDialogTitle>
            <AlertDialogDescription>
              Bạn có chắc chắn muốn xóa đánh giá này không? Hành động này không thể hoàn tác.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-lg">Hủy bỏ</AlertDialogCancel>
            <AlertDialogAction onClick={executeDelete} className="bg-red-600 hover:bg-red-700 text-white rounded-lg">
                Xóa ngay
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ReviewSection;