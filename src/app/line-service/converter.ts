import * as math from 'mathjs';
import {
    Vector3,
    MeshBasicMaterial,
    ArrowHelper,
    Mesh,
    SphereGeometry,
    BufferGeometry,
    Line,
    LineBasicMaterial,
} from 'three';
import {
    MyLine,
    MyPoint,
    equation,
    variable,
} from '../custom-types/custom-types';
import { LineService } from './line-service';
import { SceneGraphService } from '../scene-graph-service/scene-graph-service';
import { MyConstant } from '../my-constant/my-constant';

export class Converter {
    private _variables: variable[][]; // 0: x, 1: y, 2: z, 3: l, 4: t
    private _myConstant: MyConstant;
    constructor(
        private _lineService: LineService,
        private _sceneGraphService: SceneGraphService
    ) {
        this._variables = [[], [], [], [], []];
        this._myConstant = new MyConstant();
    }

    /** k-means++ 방법 적용 */
    public initCentroid(dirPoints: any[]): Vector3[] {
        //
        const k = 3;

        let centroids: Vector3[] = [dirPoints[0].point.clone()];
        for (let i = 0; i < k - 1; i++) {
            const distances: any[] = [];
            for (let dirPoint of dirPoints) {
                let minDistance = Infinity;
                let minPoint = new Vector3(0);
                for (let centroid of centroids) {
                    let distance = dirPoint.point.distanceTo(centroid);
                    if (distance < minDistance) {
                        minDistance = distance;
                        minPoint = dirPoint.point;
                    }
                }
                distances.push({ distance: minDistance, point: minPoint });
            }
            let maxDistance = math.max(distances.map((data) => data.distance));
            let maxDistancePoint = distances.find(
                (data) => data.distance === maxDistance
            );
            centroids.push(maxDistancePoint!.point);
        }
        return centroids;
    }

    public clustering() {
        const k = 3;
        /** index가 line 이름(번호) */
        let dirPoints: any[] = [];
        this._lineService.lines.forEach((line) => {
            if (line.points.length == 2) {
                let data = {
                    point: new Vector3(0),
                    name: '',
                };
                let startToEndV = this.absVector3(
                    line.points[1]
                        .clone()
                        .sub(line.points[0].clone())
                        .normalize()
                );
                data.point = startToEndV;
                data.name = line.name;
                dirPoints.push(data);
            }
        });
        let centroids = this.initCentroid(dirPoints);
        let clusteredPoints: any[][] = [[], [], []];
        const epoch = 100;
        for (let i = 0; i < epoch; i++) {
            clusteredPoints = [[], [], []];
            /** 군집화 */
            for (
                let dirPointIndex = 0;
                dirPointIndex < dirPoints.length;
                dirPointIndex++
            ) {
                let minDistance = Infinity;
                let clusterIndex = -1;
                for (
                    let centroidIndex = 0;
                    centroidIndex < k;
                    centroidIndex++
                ) {
                    let distance = dirPoints[dirPointIndex].point.distanceTo(
                        centroids[centroidIndex]
                    );
                    if (distance < minDistance) {
                        minDistance = distance;
                        clusterIndex = centroidIndex;
                    }
                }
                clusteredPoints[clusterIndex].push(dirPoints[dirPointIndex]);
            }
            /** 군집 기준점을 centroid로 이동 */
            for (let centroidIndex = 0; centroidIndex < k; centroidIndex++) {
                if (clusteredPoints[centroidIndex].length === 0) continue;
                let centroid = centroids[centroidIndex].clone();
                clusteredPoints[centroidIndex].forEach((data) =>
                    centroid.add(data.point)
                );
                centroid.divideScalar(clusteredPoints[centroidIndex].length);
                centroids[centroidIndex] = centroid;
            }
        }
        if (clusteredPoints.find((cluster) => cluster.length === 0)) {
            throw new Error('클러스터링 실패');
        } else {
            this.setAxis(clusteredPoints);
            this.adjustStartEndPoints();
        }
    }

    public setAxis(clusteredPoints: any[][]) {
        const sortFunction = function (this: Converter, a: any[], b: any[]) {
            return (
                math.mean(
                    a.map((cluster) =>
                        Math.abs(
                            this._lineService.getLineByName(cluster.name)!.a
                        )
                    )
                ) -
                math.mean(
                    b.map((cluster) =>
                        Math.abs(
                            this._lineService.getLineByName(cluster.name)!.a
                        )
                    )
                )
            );
        }.bind(this);
        clusteredPoints.sort(sortFunction);
        for (let c = 0; c < clusteredPoints.length; c++) {
            clusteredPoints[c].forEach((cluster) => {
                let line = this._lineService.getLineByName(cluster.name);
                if (line) {
                    if (c === 0) {
                        line.axis = new Vector3(1, 0, 0);
                        (line.material as MeshBasicMaterial).color.set(
                            0xff0000
                        );
                    } else if (c === 1) {
                        line.axis = new Vector3(0, 1, 0);
                        (line.material as MeshBasicMaterial).color.set(
                            0x00ff00
                        );
                    } else {
                        line.axis = new Vector3(0, 0, 1);
                        (line.material as MeshBasicMaterial).color.set(
                            0x0000ff
                        );
                    }
                }
            });
        }
    }

    public adjustStartEndPoints() {
        for (let line of this._lineService.lines) {
            if (line.points.length === 2) {
                if (line.axis?.equals(new Vector3(0, 0, 1))) {
                    if (line.points[0].y > line.points[1].y) {
                        let tempPoint = line.points[0].clone();
                        line.points[0] = line.points[1].clone();
                        line.points[1] = tempPoint.clone();

                        let tempMyPoint = line.myPoints[0];
                        line.myPoints[0] = line.myPoints[1];
                        line.myPoints[1] = tempMyPoint;
                    }
                } else if (line.axis?.equals(new Vector3(0, 1, 0))) {
                    if (line.points[0].x > line.points[1].x) {
                        let temp = line.points[0].clone();
                        line.points[0] = line.points[1].clone();
                        line.points[1] = temp.clone();

                        let tempMyPoint = line.myPoints[0];
                        line.myPoints[0] = line.myPoints[1];
                        line.myPoints[1] = tempMyPoint;
                    }
                } else {
                    if (line.points[0].x > line.points[1].x) {
                        let temp = line.points[0].clone();
                        line.points[0] = line.points[1].clone();
                        line.points[1] = temp.clone();

                        let tempMyPoint = line.myPoints[0];
                        line.myPoints[0] = line.myPoints[1];
                        line.myPoints[1] = tempMyPoint;
                    }
                }

                let point0 = line.myPoints[0].connectedLines.find(
                    (connectedPoint) => connectedPoint.line === line
                );
                if (point0 !== undefined) {
                    if (point0.pos === 'end') point0.pos = 'start';
                }
                let point1 = line.myPoints[1].connectedLines.find(
                    (connectedPoint) => connectedPoint.line === line
                );
                if (point1 !== undefined) {
                    if (point1.pos === 'start') point1.pos = 'end';
                }

                let lineDirArrow = new ArrowHelper(
                    line.myPoints[1].position
                        .clone()
                        .sub(line.myPoints[0].position.clone())
                        .normalize(),
                    line.myPoints[0].position.clone(),
                    line.points[0].distanceTo(line.points[1]) / 2,
                    0xff0ff0
                );
                this._sceneGraphService.misc.add(lineDirArrow);
            }
        }
    }

    public visualizeDirections() {
        this.clustering();
        this._lineService.lines.forEach((line) => {
            if (line.points.length == 2) {
                let startToEndV = this.absVector3(
                    line.points[1]
                        .clone()
                        .sub(line.points[0].clone())
                        .normalize()
                );

                let dp = new Mesh(
                    new SphereGeometry(0.01),
                    new MeshBasicMaterial({ color: 0xff0000 })
                );
                dp.position.copy(startToEndV.clone());
                this._sceneGraphService.misc.add(dp);
            }
        });
    }

    public convertTo3D() {
        this.clustering();
        this.setVariables();
        this.setEquations();
        this.findValues();
        console.log('result', this._variables);
        this.setConvertedPosition();
        this._lineService.lines.forEach((line) => {
            let nlG = new BufferGeometry().setFromPoints(
                line.myPoints.map((myPoint) =>
                    myPoint.convertedPosition!.clone()
                )
            );
            let nl = new Line(nlG, new LineBasicMaterial({ color: 0x000000 }));
            this._sceneGraphService.convertedLines.add(nl);
        });
    }

    public convertToCad() {
        let id = 49682874;
        let projectName = '64e55ba4e32ef2a49bd7876a_1698654759182_sampleB';
        let url = `https://proto.efsoft.kr/cad-api/profile/${id}/segment`;
        this._lineService.lines.forEach((line) => {
            if (
                line.myPoints[0] === undefined ||
                line.myPoints[1] === undefined
            ) {
                console.log('undefined myPoints');
            } else {
                if (
                    line.myPoints[0].convertedPosition === undefined ||
                    line.myPoints[1].convertedPosition === undefined
                ) {
                    console.log(line.name, 'undefined converted position');
                } else {
                    let start = line.myPoints[0].convertedPosition?.clone();
                    start!.add(line.axis!.clone().multiplyScalar(20));
                    let end = line.myPoints[1].convertedPosition?.clone();
                    end!.sub(line.axis!.clone().multiplyScalar(20));
                    let body = {
                        point0: (start as Vector3).toArray(),
                        point1: (end as Vector3).toArray(),
                        model: 'DF4040',
                        vecU: [-1, 0, 0],
                    };
                    fetch(url, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: body !== undefined ? JSON.stringify(body) : body,
                    }).then((res) => {
                        if (res.ok) {
                            console.log(line.name, body);
                        }
                    });
                }
            }
        });
    }

    private absVector3(v: Vector3): Vector3 {
        return new Vector3(Math.abs(v.x), Math.abs(v.y), Math.abs(v.z));
    }

    private setConvertedPosition() {
        this._lineService.points.forEach((point) => {
            point.convertedPosition = new Vector3(
                this._variables[0][point.order].value,
                this._variables[1][point.order].value,
                this._variables[2][point.order].value
            );
        });
    }

    private findValues() {
        let variableCount =
            this._variables[0].length +
            this._variables[1].length +
            this._variables[2].length +
            this._variables[3].length +
            this._variables[4].length;

        for (let i = 0; i < 5; i++) {
            if (i < 3) {
                this._variables[i][0].value = 0;
                this._variables[i][0].isUpdated = true;
            } else if (i === 3) {
                this._variables[i][0].value = 0;
                this._variables[i][0].isUpdated = true;
            } else {
                this._variables[i][0].value = this._myConstant.LINELENGTH;
                this._variables[i][0].isUpdated = true;
            }

            variableCount -= 5;
        }
        let sameCount = 0;
        while (this.countFalseCount() !== 0 && sameCount < 100) {
            let beforeFalseCount = this.countFalseCount();
            for (
                let variablesIndex = 3;
                variablesIndex >= 0;
                variablesIndex--
            ) {
                for (
                    let index = 0;
                    index < this._variables[variablesIndex].length;
                    index++
                ) {
                    for (let equation of this._variables[variablesIndex][index]
                        .equations) {
                        let answer = this.solveEquation(
                            equation.equation,
                            equation.parameters,
                            variablesIndex === 4
                                ? this._lineService.lines[index]
                                      .axis!.toArray()
                                      .indexOf(1)
                                : variablesIndex
                        );
                        if (
                            answer !== -99999 &&
                            !this._variables[variablesIndex][index].isUpdated
                        ) {
                            variableCount--;
                            console.log(
                                `solved!, axis: ${variablesIndex}, index: ${index}, answer: ${answer}`
                            );
                            this._variables[variablesIndex][index].value =
                                answer;
                            this._variables[variablesIndex][index].isUpdated =
                                true;
                        }
                    }
                }
            }
            let afterFalseCount = this.countFalseCount();
            if (beforeFalseCount === afterFalseCount) {
                sameCount++;
                if (sameCount > 2) {
                    let isNewLengthUpdated = false;
                    for (
                        let variableIndex = 0;
                        variableIndex < this._variables[4].length;
                        variableIndex++
                    ) {
                        if (
                            this._variables[4][variableIndex].isUpdated ===
                            false
                        ) {
                            console.log(
                                'new length: ',
                                this.getRatioLength(
                                    this._lineService.lines[variableIndex]
                                )
                            );
                            this._variables[4][variableIndex].value =
                                this.getRatioLength(
                                    this._lineService.lines[variableIndex]
                                );
                            this._variables[4][variableIndex].isUpdated = true;
                            isNewLengthUpdated = true;
                            break;
                        }
                    }
                    if (!isNewLengthUpdated) {
                        for (
                            let variableIndex = 0;
                            variableIndex < this._variables[3].length;
                            variableIndex++
                        ) {
                            if (
                                this._variables[3][variableIndex].isUpdated ===
                                false
                            ) {
                                let targetPoint =
                                    this._lineService.points[variableIndex];
                                let checkConnectedLine =
                                    targetPoint.connectedLines.find(
                                        (connectedLine) => {
                                            return connectedLine.pos === 'edge';
                                        }
                                    );
                                if (checkConnectedLine !== undefined) {
                                    let baseLine = checkConnectedLine.line;
                                    console.log(
                                        'new t: ',
                                        this.getRatioT(baseLine, targetPoint)
                                    );
                                    this._variables[3][variableIndex].value =
                                        this.getRatioT(baseLine, targetPoint);
                                    this._variables[3][
                                        variableIndex
                                    ].isUpdated = true;
                                    break;
                                }
                            }
                        }
                    }

                    sameCount = 0;
                }
            }
            console.log('remained variable count: ', variableCount);
        }
        console.log('remained variable count: ', variableCount);
    }

    private countFalseCount(): number {
        let falseCount = 0;
        for (let variablesIndex = 0; variablesIndex < 5; variablesIndex++) {
            for (let variable of this._variables[variablesIndex]) {
                if (variable.isUpdated === false) falseCount++;
            }
        }
        return falseCount;
    }
    private solveEquation(
        equation: string,
        parameters: any[],
        axis: number
    ): number {
        switch (equation) {
            case 'getSameCoord': {
                if (this._variables[axis][parameters[0]].isUpdated) {
                    return this.equationGetSameCoord(
                        this._variables[axis][parameters[0]].value
                    );
                } else return -99999;
            }
            case 'getCoord': {
                if (
                    this._variables[4][parameters[0]].isUpdated &&
                    this._variables[axis][parameters[1]].isUpdated
                ) {
                    return this.equationGetCoord(
                        this._variables[4][parameters[0]].value,
                        this._variables[axis][parameters[1]].value,
                        parameters[2]
                    );
                } else return -99999;
            }
            case 'getLength': {
                if (
                    this._variables[axis][parameters[0]].isUpdated &&
                    this._variables[axis][parameters[1]].isUpdated
                ) {
                    return this.equationGetLength(
                        this._variables[axis][parameters[0]].value,
                        this._variables[axis][parameters[1]].value
                    );
                } else return -99999;
            }
            case 'getEdgeCoord': {
                if (
                    this._variables[axis][parameters[0]].isUpdated &&
                    this._variables[axis][parameters[1]].isUpdated &&
                    this._variables[3][parameters[2]].isUpdated
                ) {
                    return this.equationGetEdgeCoord(
                        this._variables[axis][parameters[0]].value,
                        this._variables[axis][parameters[1]].value,
                        this._variables[3][parameters[2]].value
                    );
                } else return -99999;
            }
            case 'getT': {
                if (
                    this._variables[axis][parameters[0]].isUpdated &&
                    this._variables[axis][parameters[1]].isUpdated &&
                    this._variables[3][parameters[2]].isUpdated
                ) {
                    return this.equationGetT(
                        this._variables[axis][parameters[0]].value,
                        this._variables[axis][parameters[1]].value,
                        this._variables[3][parameters[2]].value
                    );
                } else return -99999;
            }
            case 'getC': {
                return this.equationGetConstant(0);
            }
            default:
                return -99999;
        }
    }

    private setEquations() {
        this._lineService.points.forEach((point) => {
            this.setPointEquation(point);
        });
        this._lineService.lines.forEach((line) => {
            this.setLengthEquation(line);
        });
    }

    // BFS 방식으로 연결된 포인트들이 가지고 있는 변수들의 방정식을 업데이트해줌
    // 식을 세워두고, 그 안의 변수 값들을 계속 변경할 수 있어야함.
    // 배열 등에 필요한 값들을 넣어두고, 그 값들을 참조해서 방정식을 푸는 방식을 해보자.
    private setPointEquation(basePoint: MyPoint) {
        // 연결된 라인이 있다면
        if (basePoint.connectedLines.length > 0) {
            basePoint.connectedLines.forEach((connectedLine) => {
                if (connectedLine.pos !== 'edge') {
                    let targetLine = connectedLine.line;
                    let targetPoint = connectedLine.point as MyPoint;
                    let targetLineAxisNumber = targetLine
                        .axis!.toArray()
                        .indexOf(1);
                    let newEquation: equation;
                    for (let index = 0; index < 4; index++) {
                        if (index < 3) {
                            if (index === targetLineAxisNumber) {
                                newEquation = {
                                    equation: 'getCoord',
                                    parameters: [
                                        targetLine.order,
                                        basePoint.order,
                                        connectedLine.pos === 'start'
                                            ? 'findEnd'
                                            : 'findStart',
                                    ],
                                };
                            } else {
                                newEquation = {
                                    equation: 'getSameCoord',
                                    parameters: [basePoint.order],
                                };
                            }
                            if (
                                this._variables[index][
                                    targetPoint.order
                                ].equations.find((equation) => {
                                    return (
                                        equation.equation ===
                                            newEquation.equation &&
                                        equation.parameters.every(
                                            (v, i) =>
                                                v === newEquation.parameters[i]
                                        )
                                    );
                                }) === undefined
                            ) {
                                this._variables[index][
                                    targetPoint.order
                                ].equations.unshift(newEquation);
                            }
                        }
                    }
                } else {
                    let baseLine = connectedLine.line;
                    let targetPoint =
                        connectedLine.line.connectedEdgeLines.find(
                            (connectedEdgeLine) => {
                                return connectedEdgeLine.position.equals(
                                    connectedLine.point as Vector3
                                );
                            }
                        )!.point as MyPoint;
                    let baseLinePoint0 = baseLine.myPoints[0];
                    let baseLinePoint1 = baseLine.myPoints[1];
                    let baseLineAxisNumber = baseLine
                        .axis!.toArray()
                        .indexOf(1);
                    let newEquation: equation;
                    for (let index = 0; index < 4; index++) {
                        if (index < 3) {
                            if (index === baseLineAxisNumber) {
                                newEquation = {
                                    equation: 'getEdgeCoord',
                                    parameters: [
                                        baseLinePoint0.order,
                                        baseLinePoint1.order,
                                        targetPoint.order,
                                    ],
                                };
                            } else {
                                newEquation = {
                                    equation: 'getSameCoord',
                                    parameters: [baseLinePoint0.order],
                                };
                            }
                        } else {
                            newEquation = {
                                equation: 'getT',
                                parameters: [
                                    baseLinePoint0.order,
                                    baseLinePoint1.order,
                                    targetPoint.order,
                                ],
                            };
                        }

                        if (
                            this._variables[index][
                                targetPoint.order
                            ].equations.find((equation) => {
                                return (
                                    equation.equation ===
                                        newEquation.equation &&
                                    equation.parameters.every(
                                        (v, i) =>
                                            v === newEquation.parameters[i]
                                    )
                                );
                            }) === undefined
                        ) {
                            if (newEquation.equation === 'getEdgeCoord') {
                                this._variables[index][
                                    targetPoint.order
                                ].equations.push(newEquation);
                            } else {
                                this._variables[index][
                                    targetPoint.order
                                ].equations.unshift(newEquation);
                            }
                        }
                    }
                    for (let index = 0; index < 3; index++) {
                        if (index !== baseLineAxisNumber) {
                            newEquation = {
                                equation: 'getSameCoord',
                                parameters: [targetPoint.order],
                            };
                            this._variables[index][
                                baseLinePoint0.order
                            ].equations.unshift(newEquation);
                            this._variables[index][
                                baseLinePoint1.order
                            ].equations.unshift(newEquation);
                        }
                    }
                }
            });
        }
    }

    private setLengthEquation(line: MyLine) {
        let newEquation: equation;
        newEquation = {
            equation: 'getLength',
            parameters: [line.myPoints[0].order, line.myPoints[1].order],
        };

        this._variables[4][line.order].equations.push(newEquation);
    }

    private setVariables() {
        for (let point of this._lineService.points) {
            this._variables[0].push({
                value: 0,
                isUpdated: false,
                equations: [],
            });
            this._variables[1].push({
                value: 0,
                isUpdated: false,
                equations: [],
            });
            this._variables[2].push({
                value: 0,
                isUpdated: false,
                equations: [],
            });
            console.log(
                point.connectedLines.find((connectedLine) => {
                    return connectedLine.pos === 'edge';
                })
            );
            point.connectedLines.find((connectedLine) => {
                return connectedLine.pos === 'edge';
            });
            this._variables[3].push({
                value: 0,
                isUpdated:
                    point.connectedLines.find((connectedLine) => {
                        return connectedLine.pos === 'edge';
                    }) === undefined
                        ? true
                        : false,
                equations: [],
            });
        }
        for (let line of this._lineService.lines) {
            this._variables[4].push({
                value: 0,
                isUpdated: false,
                equations: [],
            });
        }
    }

    /**
     * 같은 값을 구하는 함수
     * @param p
     * @returns
     */
    private equationGetSameCoord(p: number) {
        return p;
    }

    /**
     * 시작점과 끝 점으로 길이를 구하는 함수
     * length = |p2 - p1|
     * @param p1 시작 점 또는 끝 점
     * @param p2 p1의 반대편 점
     * @returns 길이
     */
    private equationGetLength(p1: number, p2: number): number {
        let length;
        length = Math.abs(p2 - p1);
        return length;
    }

    /**
     * 시작 또는 끝 점으로 반대편 점을 구하는 함수
     * p2 = p + length
     * p1 = p - length
     * @param length
     * @param p
     * @returns
     */
    private equationGetCoord(
        length: number,
        p: number,
        mode: 'findEnd' | 'findStart'
    ): number {
        let coord;
        if (mode === 'findEnd') {
            coord = p + length;
        } else {
            coord = p - length;
        }
        return coord;
    }

    /**
     * edge에 연결된 점 좌표를 찾는 함수
     * p = p1 + length * t
     * @param p1
     * @param p2
     * @param t
     * @returns
     */
    private equationGetEdgeCoord(p1: number, p2: number, t: number) {
        let coord;
        coord = p1 + t * (p2 - p1);
        return coord;
    }

    private equationGetT(p1: number, p2: number, p3: number) {
        return (p3 - p1) / (p2 - p1);
    }

    private equationGetConstant(c: number) {
        return c;
    }

    private getRatioT(baseLine: MyLine, targetPoint: MyPoint) {
        let baseLinePoint0 = baseLine.myPoints[0];
        let baseLinePoint1 = baseLine.myPoints[1];
        let baseLineAxisNumber = baseLine.axis!.toArray().indexOf(1);
        let baseLineLength = baseLinePoint0.position.distanceTo(
            baseLinePoint1.position
        );
        let targetLineLength = baseLinePoint0.position.distanceTo(
            targetPoint.position
        );
        return math.round(targetLineLength / baseLineLength, 1);
    }

    private getRatioLength(line: MyLine) {
        let targetLength2d = line.myPoints[0].position.distanceTo(
            line.myPoints[1].position
        );
        let baseLength2d =
            this._lineService.lines[0].myPoints[0].position.distanceTo(
                this._lineService.lines[0].myPoints[1].position
            );
        let ratio = math.round(targetLength2d / baseLength2d, 1);
        let ratioLength = ratio * this._myConstant.LINELENGTH;
        return ratioLength;
    }
}
