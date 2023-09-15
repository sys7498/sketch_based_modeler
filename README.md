# SketchBasedModeler

마우스 클릭 시작 혹은 터치 시작 시 새로운 라인 생성
점 사이 거리가 0.3을 넘어가면 직선으로 잇고, 모든 점들을 배열로 저장
lines: LineObject[]
points: Vector3[][]

곡선의 갯수가 lines배열의 길이,
곡선의 시작점과 끝점이 자신의 line index와 같은 index의 points 배열 element의 0번째 점과 length-1 점
