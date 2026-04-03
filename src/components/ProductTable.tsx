import React from "react";
import { ProductType } from "../types/product";
import { ProductEnum } from "../longProcesses/enums";
import { useSignedMediaUrl } from "../hooks/useSignedMediaUrl";

type Props = {
    list: Array<ProductType>;
};

function ProductTableRow({ item, index }: { item: ProductType; index: number }) {
    const thumbnailUrl = useSignedMediaUrl(item?.thumbnailUrl);

    return (
        <tr key={item?.id}>
            <td>{index + 1}</td>
            <td>{item?.id}</td>
            <td>{item?.title}</td>
            <td>{item?.type}</td>
            <td>
                <img
                    src={thumbnailUrl || item?.thumbnailUrl}
                    alt={item?.title}
                    width={50}
                    height={50}
                    loading="lazy"
                />
            </td>
        </tr>
    );
}

const Table = ({ list }: Props) => {
    return (
        <div className="table">
            <table>
                <thead>
                    <tr>
                        <th>#</th>
                        <th>{ProductEnum.id}</th>
                        <th>{ProductEnum.title}</th>
                        <th>{ProductEnum.type}</th>
                        <th>{ProductEnum.thumbnailUrl}</th>
                    </tr>
                </thead>
                <tbody>
                    {list.length > 0 &&
                        list.map((item, index: number) => {
                            return <ProductTableRow key={item?.id} item={item} index={index} />;
                        })}
                </tbody>
            </table>
        </div>
    );
};

export default Table;
