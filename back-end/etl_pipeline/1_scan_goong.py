# scanner.py

import requests
import time
import config
import db_manager
import sys
from requests.exceptions import RequestException, HTTPError

# === CẤU HÌNH HẰNG SỐ ===
BASE_URL = "https://rsapi.goong.io"
SLEEP_TIME = 0.2  # Tăng nhẹ để tránh bị chặn

# === THAY ĐỔI 1: ĐỊNH NGHĨA LỖI TÙY CHỈNH ===
class RateLimitError(Exception):
    """Lỗi tùy chỉnh khi gặp giới hạn 429"""
    pass

def get_hcmc_grid():
    """
    Định nghĩa "grid" (lưới) của chúng ta cho TP. Hồ Chí Minh.
    Đây là danh sách các tâm điểm của các quận/khu vực.
    """
    grid = [
        # --- Các quận trung tâm ---
        # {'name': 'Quận 1', 'lat': 10.7769, 'lon': 106.7009},
        # {'name': 'Quận 3', 'lat': 10.7828, 'lon': 106.6869},
        # {'name': 'Quận 4', 'lat': 10.7593, 'lon': 106.7023},
        # {'name': 'Quận 5', 'lat': 10.7547, 'lon': 106.6585},
        # {'name': 'Quận 6', 'lat': 10.7480, 'lon': 106.6346},
        # {'name': 'Quận 8', 'lat': 10.7225, 'lon': 106.6231},
        # {'name': 'Quận 10', 'lat': 10.7702, 'lon': 106.6661},
        # {'name': 'Quận 11', 'lat': 10.7623, 'lon': 106.6501},
        # {'name': 'Quận Phú Nhuận', 'lat': 10.7937, 'lon': 106.6891},//
        # {'name': 'Quận Bình Thạnh', 'lat': 10.8016, 'lon': 106.7081},
        # {'name': 'Quận Tân Bình', 'lat': 10.7997, 'lon': 106.6589},//
        # {'name': 'Quận Tân Phú', 'lat': 10.7782, 'lon': 106.6217},//
        # {'name': 'Quận Gò Vấp', 'lat': 10.8288, 'lon': 106.6658},//
        # # --- Các quận ven & TP. Thủ Đức ---
        # {"name": "Quận 7", "lat": 10.7300, "lon": 106.7214},//
        # {'name': 'Quận 12', 'lat': 10.8672, 'lon': 106.6413},
        # {'name': 'Quận Bình Tân', 'lat': 10.7554, 'lon': 106.5879},
        {'name': 'Thành phố Thủ Đức', 'lat': 10.8200, 'lon': 106.7692},
        # # --- Các huyện ngoại thành ---
        # {'name': 'Huyện Hóc Môn', 'lat': 10.8845, 'lon': 106.5936},
        # {'name': 'Huyện Bình Chánh', 'lat': 10.7107, 'lon': 106.5714},
        # {'name': 'Huyện Nhà Bè', 'lat': 10.6866, 'lon': 106.7216},
        # {'name': 'Huyện Củ Chi', 'lat': 11.0560, 'lon': 106.4950},
        # {'name': 'Huyện Cần Giờ', 'lat': 10.5516, 'lon': 106.8797}
    ]
    return grid


def get_search_terms():
    """Các từ khóa chúng ta sẽ dùng để quét (càng nhiều càng tốt)"""
    # (Giữ nguyên hàm này, không cần thay đổi)
    return [
        # === LOẠI HÌNH CHUNG ===
        "nhà hàng",
        "quán ăn",
        "quán cơm",
        "tiệm ăn",
        "quán nhậu",
        "quán nước",
        "cà phê",
        "tiệm trà",
        "trà sữa",
        "tiệm bánh",
        "ăn vặt",
        "ăn đêm",
        "cơm văn phòng",
        "buffet",
        "lẩu",
        "nướng",
        "hải sản",
        "ốc",
        "đặc sản",
        "ẩm thực",
        "quán chay",
        "trà",
        # === MÓN ĂN VIỆT NAM (THEO MÓN) ===
        # Phở & Bún & Mì
        "phở",
        "phở bò",
        "phở gà",
        "bún bò",
        "bún bò Huế",
        "bún đậu",
        "bún đậu mắm tôm",
        "bún chả",
        "bún riêu",
        "bún mắm",
        "bún thịt nướng",
        "bún cá",
        "hủ tiếu",
        "hủ tiếu nam vang",
        "hủ tiếu gõ",
        "mì quảng",
        "cao lầu",
        "bánh canh",
        "bánh canh cua",
        "bánh canh ghẹ",
        # Cơm
        "cơm tấm",
        "cơm sườn",
        "cơm gà",
        "cơm gà xối mỡ",
        "cơm chiên",
        "cơm niêu",
        # Bánh
        "bánh mì",
        "bánh mì chảo",
        "bánh mì que",
        "bánh xèo",
        "bánh khọt",
        "bánh cuốn",
        "bánh bèo",
        "bánh bột lọc",
        "bánh nậm",
        "bánh giò",
        "bánh bao",
        # Gỏi & Khai vị
        "gỏi cuốn",
        "chả giò",
        "gỏi",
        # Khác
        "cháo",
        "cháo lòng",
        "cháo gà",
        "xôi",
        "xôi mặn",
        "xôi gà",
        "bò kho",
        "bò né",
        "phá lấu",
        "cút lộn xào me",
        # === ẨM THỰC QUỐC TẾ ===
        "món Hàn",
        "BBQ Hàn Quốc",
        "cơm trộn",
        "tokbokki",
        "gà rán",
        "gà rán Hàn Quốc",
        "món Nhật",
        "sushi",
        "sashimi",
        "ramen",
        "udon",
        "cơm Nhật",
        "món Trung",
        "dimsum",
        "hủ tiếu mì",
        "mì vịt tiềm",
        "cơm chiên Dương Châu",
        "món Thái",
        "lẩu Thái",
        "gỏi Thái",
        "pad Thái",
        "cơm Thái",
        "món Ý",
        "pizza",
        "mì Ý",
        "pasta",
        "spaghetti",
        "món Âu",
        "steak",
        "bít tết",
        "món Ấn",
        "cà ri",
        "món Mexico",
        "món Pháp",
        # === ĐỒ UỐNG & TRÁNG MIỆNG ===
        "trà sữa",
        "trà đào",
        "trà trái cây",
        "nước ép",
        "sinh tố",
        "kem",
        "chè",
        "tàu hũ",
        "bánh flan",
        "rau câu",
        "yaourt",
        "bia",
        "bia hơi",
        "bia thủ công",
        "bar",
        "pub",
        "tiệm bánh ngọt",
        "bánh kem",
        "bánh donut",
        "croissant",
        # === LOẠI HÌNH CỤ THỂ ===
        "fine dining",
        "nhà hàng sang trọng",
        "quán bar",
        "beer club",
        "cà phê sách",
        "cà phê thú cưng",
        "cà phê sân vườn"
        # === QUÁN CÀ PHÊ THƯƠNG HIỆU ===
        "Highlands Coffee",
        "The Coffee House",
        "Starbucks",
        "Phúc Long",
        "Cộng Cà Phê",
        "Katinat",
        "Cafe Amazon",
        "Trung Nguyên Legend",
        "Urban Station",
        "Papaxốt Coffee",
        "Coffee Bean & Tea Leaf",
        "Passio Coffee",
        "Guta Coffee",
        "Nenem Coffee",
        "Oromia Coffee",
        "TocoToco",
        "Koi Thé",
        "Gong Cha",
        "Tee Talk",
        "Heekcaa",
        "Sharetea",
        "Ding Tea",
        "Bobapop",
        "Royal Tea",
        # === QUÁN ĂN NHANH – FAST FOOD ===
        "KFC",
        "McDonalds",
        "Lotteria",
        "Jollibee",
        "Burger King",
        "Pizza Hut",
        "Domino's Pizza",
        "Texas Chicken",
        "Popeyes",
        "Bánh Mì PewPew",
        "Bánh Mì Xin Chào",
        # === THƯƠNG HIỆU ĐỒ ĂN NHẸ / CÀ PHÊ TAKE AWAY ===
        "BreadTalk",
        "Tous Les Jours",
        "Dunkin Donuts",
        "Starbucks Reserve",
        "Marukame Udon",
        "Sushi Kei",
        "Hot & Cold",
        "Katinat Saigon Kafé",
        # === THƯƠNG HIỆU TRÀ SỮA (ĐÃ CÓ NHƯNG BỔ SUNG THÊM) ===
        "Tiger Sugar",
        "Trà sữa Mixue",
        "Feeling Tea",
        "ChaGo Tea & Café",
        "Holliday Tea",
        "Maku Tea",
        "Heytea",
    ]


def call_api(session, url, params):
    """
    Hàm gọi API chung với cơ chế xử lý lỗi và tuân thủ rate limit.
    === ĐÃ CẬP NHẬT ĐỂ NÉM LỖI 429 ===
    """
    try:
        time.sleep(config.REQUEST_SLEEP_TIME)
        response = session.get(url, params=params)

        # === THAY ĐỔI 2: NÉM LỖI 429 THAY VÌ THOÁT ===
        if response.status_code == 429:
            print(
                "\n!!! LỖI NGHIÊM TRỌNG: "
                "ĐÃ ĐẠT GIỚI HẠN YÊU CẦU (429)!!!"
            )
            print("Nguyên nhân: Rất có thể bạn đã hết 1000 yêu cầu/ngày.")
            print(
                "Nhờ có 'INSERT OR IGNORE', kịch bản sẽ tự động "
                "tiếp tục phần còn lại vào lần chạy sau."
            )
            # Ném lỗi tùy chỉnh
            raise RateLimitError("Đã đạt giới hạn yêu cầu 429")

        response.raise_for_status()
        return response.json()

    except HTTPError as http_err:
        print(f"Lỗi HTTP khi gọi API {url}: {http_err}")
        return None
    except RequestException as e:
        print(f"Lỗi kết nối khi gọi API {url}: {e}")
        return None
    # (Bỏ except SystemExit)
    except Exception as e:
        # Bắt các lỗi không lường trước
        print(f"Một lỗi không xác định xảy ra: {e}")
        return None


def start_scan():
    """
    Bắt đầu quá trình quét toàn bộ TP.HCM để tìm quán ăn.
    """
    conn = db_manager.create_connection()
    if conn is None:
        print("Không thể kết nối đến database. Đang dừng...")
        return

    db_manager.create_table(conn)

    session = requests.Session()
    grid = get_hcmc_grid()
    search_terms = get_search_terms()

    unique_place_ids = set()
    total_new_places = 0

    print("--- Bắt đầu Giai đoạn 1: Quét Place IDs ---")

    # === THAY ĐỔI 3: BẮT LỖI 429 TRONG GIAI ĐOẠN 1 ===
    rate_limit_hit = False  # Cờ báo hiệu lỗi 429

    for area in grid:
        if rate_limit_hit:  # Nếu đã gặp lỗi 429, dừng quét Giai đoạn 1
            break
        for term in search_terms:
            print(
                f"Đang quét: Từ khóa='{term}', Khu vực='{area['name']}'..."
            )

            autocomplete_url = f"{BASE_URL}/Place/AutoComplete"
            params = {
                "input": f"{term} {area['name']}",
                "location": f"{area['lat']},{area['lon']}",
                "radius": 5,
                "limit": 50,
                "more_compound": "true",
                "api_key": config.GOONG_API_KEY,
            }

            try:
                data = call_api(session, autocomplete_url, params)
            except RateLimitError:
                print(
                    "Lỗi 429 xảy ra trong Giai đoạn 1. Dừng quét Giai đoạn 1."
                )
                rate_limit_hit = True  # Đặt cờ
                break  # Thoát vòng lặp 'term'

            if (
                data
                and data.get("status") == "OK"
                and data.get("predictions")
            ):
                count = 0
                for pred in data["predictions"]:
                    if (
                        pred.get("compound", {}).get("province")
                        == "Hồ Chí Minh"
                    ):
                        unique_place_ids.add(pred["place_id"])
                        count += 1
                print(f"    -> Tìm thấy {count} kết quả liên quan ở TP.HCM.")

    print(
        f"\n--- Giai đoạn 1 Hoàn tất: "
        f"Tìm thấy {len(unique_place_ids)} địa điểm duy nhất. ---"
    )
    print("--- Bắt đầu Giai đoạn 2: Lấy chi tiết và lưu vào Database ---")

    # === THAY ĐỔI 4: BẮT LỖI 429 TRONG GIAI ĐOẠN 2 ===
    try:
        # Bọc toàn bộ vòng lặp Giai đoạn 2 trong try...except
        for i, place_id in enumerate(list(unique_place_ids)):
            print(
                f"Đang xử lý {i+1}/{len(unique_place_ids)}: "
                f"{place_id[:20]}..."
            )

            detail_url = f"{BASE_URL}/Place/Detail"
            params = {"place_id": place_id, "api_key": config.GOONG_API_KEY}

            # call_api sẽ ném RateLimitError nếu gặp lỗi 429
            data = call_api(session, detail_url, params)

            if data and data.get("status") == "OK" and data.get("result"):
                result = data["result"]
                location = result.get("geometry", {}).get("location", {})

                restaurant_data = {
                    "goong_place_id": result.get("place_id"),
                    "name": result.get("name"),
                    "address": result.get("formatted_address"),
                    "latitude": location.get("lat"),
                    "longitude": location.get("lng"),
                    "province": result.get("compound", {}).get("province"),
                    "district": result.get("compound", {}).get("district"),
                    "commune": result.get("compound", {}).get("commune"),
                }

                if (
                    restaurant_data["goong_place_id"]
                    and restaurant_data["name"]
                ):
                    row_id = db_manager.insert_restaurant(
                        conn, restaurant_data
                    )
                    if row_id:
                        total_new_places += 1
                        print(f"    -> Đã lưu: {restaurant_data['name']}")

    except RateLimitError:
        # Nếu Giai đoạn 2 gặp lỗi 429, chúng ta sẽ dừng vòng lặp tại đây
        print("\nLỗi 429 xảy ra trong Giai đoạn 2.")
        print("Đang dừng Giai đoạn 2 và chuyển sang tổng kết.")

    # === THAY ĐỔI 5: CẬP NHẬT THÔNG BÁO TỔNG KẾT ===
    print("\n--- Giai đoạn 2 Hoàn tất (hoặc bị dừng do lỗi 429) ---")
    print(
        f"Quá trình quét hoàn tất. "
        f"Đã thêm {total_new_places} địa điểm mới vào database."
    )

    conn.close()

def main():
    """
    Hàm chính để chạy ứng dụng quét database.
    """
    if config.GOONG_API_KEY == "YOUR_REST_API_KEY_GOES_HERE":
        print("=" * 60)
        print("LỖI: Bạn chưa cấu hình API Key.")
        print("Vui lòng cập nhật 'GOONG_API_KEY' của bạn.")
        print("=" * 60)
        sys.exit(1)

    print("Bắt đầu quá trình quét và xây dựng database quán ăn TP.HCM...")
    start_scan()
    print("Hoàn tất.")


if __name__ == "__main__":
    main()
