from outscraper import ApiClient
import json

# 1. Cấu hình API Key (Lấy tại https://app.outscraper.com/profile)
API_KEY = 'MmI2NmUyNGY0Mzk1NDY4ZGExZDQzOWI3ZjAwMWY2NGV8YWQyZGYxZmNlMg'

def test_outscraper_connection():
    print("🔄 Đang gửi yêu cầu kiểm tra đến OutScraper...")
    
    client = ApiClient(api_key=API_KEY)
    
    try:
        # 2. Thực hiện truy vấn mẫu: Tìm 1 quán cafe tại Hà Nội
        # Sử dụng limit=1 để test nhanh
        results = client.google_maps_search(
            'Highlands Coffee Hoan Kiem Hanoi', 
            limit=1, 
            language='vi'
        )
        
        # 3. Kiểm tra kết quả trả về
        if results and len(results) > 0 and len(results) > 0:
            place_data = results
            
            print("\n✅ KẾT NỐI THÀNH CÔNG!")
            print("-" * 30)
            print(f"Tên địa điểm: {place_data.get('name')}")
            print(f"Địa chỉ:      {place_data.get('full_address')}")
            print(f"Place ID:     {place_data.get('place_id')}")
            print("-" * 30)
            
            # In thử một phần dữ liệu JSON thô để bạn dễ hình dung cấu trúc
            # print("Dữ liệu JSON thô:", json.dumps(place_data, ensure_ascii=False, indent=2))
        else:
            print("⚠️ API hoạt động nhưng không tìm thấy dữ liệu cho truy vấn này.")
            
    except Exception as e:
        print("\n❌ KẾT NỐI THẤT BẠI")
        print(f"Lỗi chi tiết: {e}")
        print("Gợi ý: Kiểm tra lại API Key hoặc số dư tài khoản (credits).")

if __name__ == "__main__":
    test_outscraper_connection()