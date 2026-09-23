export type Story = {
  slug: string;
  title: string;
  author: string;
  genre: string;
  tags: string[];
  status: "Đang ra" | "Hoàn thành";
  blurb: string;
  rating: string;
  reads: string;
  chapters: number;
  freeChapters: number;
  updated: string;
  palette: [string, string];
  symbol: string;
  featured?: boolean;
};

export const stories: Story[] = [
  {
    slug: "thanh-pho-sau-con-mua",
    title: "Thành Phố Sau Cơn Mưa",
    author: "Lâm Hạ",
    genre: "Đô thị",
    tags: ["Tình cảm", "Chữa lành", "Hiện đại"],
    status: "Đang ra",
    blurb: "Giữa những ngày thành phố không ngừng chuyển động, An tìm thấy một tiệm sách chỉ mở cửa sau cơn mưa. Và ở đó, có người vẫn giữ lại lá thư cô chưa từng gửi.",
    rating: "4.9",
    reads: "128K",
    chapters: 86,
    freeChapters: 1,
    updated: "2 giờ trước",
    palette: ["#304e5c", "#152633"],
    symbol: "☂",
    featured: true,
  },
  {
    slug: "duoi-tan-trang-cu",
    title: "Dưới Tán Trăng Cũ",
    author: "Mộc Yên",
    genre: "Cổ đại",
    tags: ["Huyền huyễn", "Lãng mạn"],
    status: "Đang ra",
    blurb: "Một lời hẹn dưới tán trăng, qua ba kiếp người vẫn chưa thể quên.",
    rating: "4.8",
    reads: "96K",
    chapters: 124,
    freeChapters: 1,
    updated: "5 giờ trước",
    palette: ["#703c53", "#271d37"],
    symbol: "☽",
  },
  {
    slug: "ky-su-nguoi-nhat-sao",
    title: "Ký Sự Người Nhặt Sao",
    author: "Nam Phong",
    genre: "Kỳ ảo",
    tags: ["Phiêu lưu", "Thế giới khác"],
    status: "Đang ra",
    blurb: "Khi bầu trời rơi xuống, một người thợ đồng hồ nhận nhiệm vụ nhặt lại từng vì sao.",
    rating: "4.9",
    reads: "81K",
    chapters: 72,
    freeChapters: 1,
    updated: "Hôm qua",
    palette: ["#3d5277", "#17233f"],
    symbol: "✦",
  },
  {
    slug: "quan-ca-phe-cuoi-con-hem",
    title: "Quán Cà Phê Cuối Con Hẻm",
    author: "Diệp Chi",
    genre: "Đời thường",
    tags: ["Chữa lành", "Ẩm thực"],
    status: "Hoàn thành",
    blurb: "Mỗi vị khách để lại một câu chuyện, và mỗi tách cà phê đều có cách riêng để nói lời tạm biệt.",
    rating: "4.7",
    reads: "204K",
    chapters: 52,
    freeChapters: 1,
    updated: "Đã hoàn thành",
    palette: ["#a96b46", "#4d302e"],
    symbol: "☕",
  },
  {
    slug: "ngay-chung-ta-gap-lai",
    title: "Ngày Chúng Ta Gặp Lại",
    author: "Hạ Vi",
    genre: "Tình cảm",
    tags: ["Thanh xuân", "Hiện đại"],
    status: "Hoàn thành",
    blurb: "Mười năm sau, ga tàu cũ vẫn ở đó. Chỉ có hai người đã học được cách nói thật lòng.",
    rating: "4.8",
    reads: "172K",
    chapters: 68,
    freeChapters: 1,
    updated: "Đã hoàn thành",
    palette: ["#c47d79", "#6e4c66"],
    symbol: "✿",
  },
  {
    slug: "ban-do-cua-nhung-giac-mo",
    title: "Bản Đồ Của Những Giấc Mơ",
    author: "Từ Mộc",
    genre: "Kỳ ảo",
    tags: ["Bí ẩn", "Phiêu lưu"],
    status: "Đang ra",
    blurb: "Một tấm bản đồ thay đổi mỗi khi người giữ nó chìm vào giấc ngủ.",
    rating: "4.6",
    reads: "64K",
    chapters: 43,
    freeChapters: 1,
    updated: "1 ngày trước",
    palette: ["#638785", "#283e4c"],
    symbol: "✧",
  },
  {
    slug: "nha-co-den-sang",
    title: "Nhà Có Đèn Sáng",
    author: "Minh Tâm",
    genre: "Đời thường",
    tags: ["Gia đình", "Chữa lành"],
    status: "Đang ra",
    blurb: "Sau một chuyến đi rất dài, điều cô mong nhất chỉ là thấy ô cửa sổ quen thuộc vẫn còn sáng.",
    rating: "4.9",
    reads: "58K",
    chapters: 31,
    freeChapters: 1,
    updated: "3 ngày trước",
    palette: ["#b48a5c", "#695045"],
    symbol: "⌂",
  },
  {
    slug: "vuon-nguoi-giu-gio",
    title: "Vườn Người Giữ Gió",
    author: "Thiên Lam",
    genre: "Cổ đại",
    tags: ["Huyền huyễn", "Phiêu lưu"],
    status: "Hoàn thành",
    blurb: "Trên đỉnh núi không có mùa, người giữ gió chờ một vị khách đã lạc đường từ trăm năm trước.",
    rating: "4.7",
    reads: "111K",
    chapters: 94,
    freeChapters: 1,
    updated: "Đã hoàn thành",
    palette: ["#62798c", "#2c394b"],
    symbol: "❀",
  },
];

export const featuredStory = stories.find((story) => story.featured)!;
export const genres = ["Tất cả", "Đô thị", "Tình cảm", "Cổ đại", "Kỳ ảo", "Đời thường"];

export function getStory(slug: string) {
  return stories.find((story) => story.slug === slug);
}

export function chapterTitle(number: number) {
  const titles = [
    "Tiệm sách trong mưa",
    "Một lá thư chưa gửi",
    "Người ở phía bên kia đường",
    "Ngày nắng đầu tiên",
    "Những điều ở lại",
  ];
  return titles[number - 1] ?? `Chương ${number}: Một trang mới`;
}

export const sampleParagraphs = [
  "Cơn mưa đến khi thành phố vừa lên đèn. Từng vệt sáng kéo dài trên mặt đường, tan ra trong những vòng nước nhỏ dưới bánh xe. An đứng dưới mái hiên, ôm tập giấy vào ngực và chờ cho tiếng mưa bớt dày.",
  "Bên kia đường, một ô cửa màu vàng hổ phách bỗng sáng lên. Tấm biển gỗ treo hơi nghiêng, nét chữ đã mờ đi theo năm tháng: Tiệm sách Mùa Sau. Cô không nhớ lần gần nhất mình nhìn thấy nơi này là khi nào.",
  "Có những nơi chỉ xuất hiện khi người ta thật sự cần đến. An từng nghĩ đó là một câu viết đẹp trong truyện. Buổi tối hôm ấy, lần đầu tiên cô thấy mình muốn tin nó là thật.",
  "Tiếng chuông nhỏ vang lên lúc cô đẩy cửa. Mùi giấy cũ và trà nóng quyện vào nhau, dịu dàng đến mức mọi âm thanh ngoài phố dường như lùi lại rất xa. Sau quầy, một người ngẩng lên, ánh mắt chợt dừng trên tập giấy cô đang cầm.",
  "“Cô đến đúng lúc,” người ấy nói, như thể cuộc gặp này đã được hẹn từ lâu. An định hỏi vì sao, nhưng ở cuối gian phòng, trên chiếc bàn cạnh cửa sổ, có một phong thư mang nét chữ của chính cô.",
];
